# Alert Button Race Condition Analysis - Why Both Fixes Can't Coexist

## Problem Statement

After implementing the cache invalidation fix (v0.0.39):
- ✅ Alert button click now opens settings
- ❌ Cache invalidation appears broken (second search after config still fails)

**But**: Only debug logging was added between working and broken versions - no functional code changed!

## Code Comparison

### Cache Fix Implementation (Still Present in Code)

**File: `/src/pages/logseq/httpServerClient.ts:67-71`**
```typescript
public clearCache() {
  console.log('[HTTP Server Client] Cache cleared - will reload config on next request');
  this.serverUrl = '';
  this.graphName = '';
}
```
✅ Method exists

**File: `/src/pages/background/index.ts:11-27`**
```typescript
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.graphName || changes.logseqHostName || changes.logseqPort) {
      console.log('[Logseq DB Sidekick] Config changed, clearing HTTP client cache');
      getLogseqService().then((service) => {
        service.client.clearCache();
      }).catch((err) => {
        console.error('[Logseq DB Sidekick] Failed to clear cache:', err);
      });
    }
  }
});
```
✅ Listener exists

### Content Script Auto-Retry Logic (From Previous v0.0.38 Fix)

**File: `/src/pages/content/LogseqSidekick.tsx:36-67`**
```typescript
const handleStorageChange = (changes: any, areaName: string) => {
  if (areaName === 'local' && changes.graphName) {
    const oldGraphName = changes.graphName.oldValue;
    const newGraphName = changes.graphName.newValue;

    // Reload config to update state
    loadConfig();

    // If graph was just configured (empty -> non-empty), re-trigger search
    if (!oldGraphName && newGraphName) {
      console.log('[Logseq DB Sidekick] Graph just configured! Re-triggering search...');
      const searchParams = new URLSearchParams(window.location.search);
      const query = searchParams.get('q');

      if (query) {
        console.log('[Logseq DB Sidekick] Re-sending search query:', query);
        connect.postMessage({ type: 'query', query: query });  // ⚠️ RACE CONDITION
      }
    }
  }
};
```
✅ Auto-retry exists

## Three Hypotheses

### Hypothesis 1: Race Condition - Content Script Searches Before Cache Clears

**The Problem:**

When user saves graph name in settings, **TWO** storage listeners fire simultaneously:

1. **Content script listener** (LogseqSidekick.tsx:36-67)
   - Detects graph name changed
   - **Immediately** re-triggers search via `connect.postMessage({ type: 'query', query })`

2. **Background script listener** (background/index.ts:11-27)
   - Detects graph name changed
   - Calls `getLogseqService().then(service => service.client.clearCache())`
   - **But this is async!**

**Race Condition Timeline:**
```
T=0ms:  User saves graph name → Storage updated
T=1ms:  Content script listener fires
T=2ms:  Content script sends search query to background
T=3ms:  Background receives query, calls getConfig()
T=4ms:  getConfig() checks `if (!this.serverUrl)` → FALSE (cached from first search!)
T=5ms:  getConfig() returns cached EMPTY graphName
T=6ms:  Search fails: "Graph name not configured"
T=10ms: Background script listener fires (async promise resolves)
T=11ms: clearCache() called (TOO LATE - search already happened!)
```

**Why This Explains the Behavior:**
- Cache clear happens TOO LATE
- Content script triggers search BEFORE background clears cache
- Search uses stale cached value

**Evidence:**
- Both mechanisms exist in code
- Both should trigger on storage change
- JavaScript promises don't guarantee execution order

---

### Hypothesis 2: Browser Extension Context Isolation Issue

**The Problem:**

Browser extensions have multiple isolated JavaScript contexts:
- Background service worker (one instance)
- Content script instance (one per webpage)

Storage change events fire in **all contexts simultaneously**, but:
- Content script can't directly access background's HttpServerClient instance
- Background script's `clearCache()` only affects background's instance
- If content script searches while background still processing, race occurs

**Why This Could Happen:**

```
Storage Change Event → Broadcasts to all contexts

┌─────────────────────┐          ┌──────────────────────┐
│  Content Script     │          │  Background Worker   │
│  (Webpage Context)  │          │  (Service Worker)    │
├─────────────────────┤          ├──────────────────────┤
│ 1. Detect change    │          │ 1. Detect change     │
│ 2. Send query       │──msg──>  │ 2. Start clearCache()│
│    immediately      │          │    (async Promise)   │
│                     │          │ 3. Receive query msg │
│                     │          │ 4. Call getConfig()  │
│                     │          │    → stale cache!    │
│                     │          │ 5. clearCache done   │
│                     │          │    (too late)        │
└─────────────────────┘          └──────────────────────┘
```

**Evidence:**
- Content script and background run in separate V8 contexts
- Message passing is async
- Promise resolution timing is non-deterministic

---

### Hypothesis 3: Content Script Re-Trigger Bypasses Cache Clear Timing

**The Problem:**

The content script's auto-retry was added in v0.0.38 to work around the cache issue, but it creates a **timing dependency**:

**Content Script Logic:**
```typescript
if (!oldGraphName && newGraphName) {
  // This happens IMMEDIATELY when storage changes
  connect.postMessage({ type: 'query', query: query });
}
```

**Background Cache Clear Logic:**
```typescript
getLogseqService().then((service) => {
  service.client.clearCache();  // This happens AFTER promise resolves
})
```

**The Promise Chain:**
1. `getLogseqService()` - async call
2. `.then()` - waits for service
3. `clearCache()` - finally executes

By the time step 3 executes, content script's search is already processed with stale cache!

**Why v0.0.38 Didn't Work:**
- It tried to fix the symptom (no auto-retry after config)
- But didn't fix the root cause (cache not clearing in time)
- Created a race between two async operations

---

## Testing Plan

### Test 1: Verify Race Condition (Hypothesis 1 & 3)

**Goal:** Confirm content script search happens before cache clear

**Steps:**
1. Clear graph name in settings
2. Do a search → Alert appears
3. Click alert → Configure graph name
4. **Check timestamps in console logs**

**Expected Console Output (if race exists):**
```
[Logseq DB Sidekick] Storage changed: {"graphName":{...}}
[Logseq DB Sidekick] Graph just configured! Re-triggering search...
[Logseq DB Sidekick] Re-sending search query: test
[Logseq DB Sidekick] Received query: test
[HTTP Server Client] Full config: {"graphName":""}  ← STALE!
[HTTP Server Client] Graph name:                    ← EMPTY!
[Logseq DB Sidekick] Config changed, clearing HTTP client cache
[HTTP Server Client] Cache cleared - will reload config on next request
```

**Key Evidence:**
- "Full config" log appears BEFORE "Cache cleared" log
- Config shows empty graphName despite storage being updated
- Cache clear happens after search completes

---

### Test 2: Disable Content Script Auto-Retry

**Goal:** Test if removing content script's auto-search fixes the issue

**Code Change:**
Comment out auto-retry in `LogseqSidekick.tsx:47-60`:
```typescript
// TEMPORARILY DISABLE to test hypothesis
/*
if (!oldGraphName && newGraphName) {
  console.log('[Logseq DB Sidekick] Graph just configured! Re-triggering search...');
  connect.postMessage({ type: 'query', query: query });
}
*/
```

**Steps:**
1. Build and reload extension
2. Clear graph name → Search → Alert appears
3. Configure graph name (don't manually search yet!)
4. Wait 2 seconds
5. Manually do a new search

**Expected Result (if hypothesis correct):**
- Manual search AFTER 2 seconds should work
- Cache will have cleared by then
- Proves timing issue, not implementation issue

---

### Test 3: Add Synchronous Cache Clear Before Search

**Goal:** Force cache clear to happen BEFORE content script search

**Code Change in `background/index.ts`:**
```typescript
// Create a flag to track cache state
let cacheNeedsRefresh = false;

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.graphName || changes.logseqHostName || changes.logseqPort) {
      console.log('[Logseq DB Sidekick] Config changed, marking cache for refresh');
      cacheNeedsRefresh = true;  // Set flag immediately

      getLogseqService().then((service) => {
        service.client.clearCache();
        cacheNeedsRefresh = false;
        console.log('[Logseq DB Sidekick] Cache cleared');
      });
    }
  }
});

browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    if (msg.type === 'query') {
      const promise = new Promise(async () => {
        // Check flag BEFORE getting service
        if (cacheNeedsRefresh) {
          console.log('[Logseq DB Sidekick] Cache refresh pending, forcing clear now');
          const service = await getLogseqService();
          service.client.clearCache();
          cacheNeedsRefresh = false;
        }

        // Now proceed with search
        const logseqService = await getLogseqService();
        // ... rest of search logic
      });
    }
  });
});
```

**Steps:**
1. Build and test broken scenario
2. Check if search works immediately after config

**Expected Result (if fix works):**
- Flag ensures cache is cleared BEFORE search processes
- Search should succeed even with race condition

---

## Recommended Fix Strategy

**If Hypothesis 1 or 3 confirmed (most likely):**

### Option A: Remove Content Script Auto-Retry
- Delete auto-retry logic from LogseqSidekick.tsx
- Rely on cache invalidation only
- User must manually search again after config
- **Pros:** Simple, no race condition
- **Cons:** Slightly worse UX (no auto-retry)

### Option B: Add Synchronization Flag
- Implement Test 3's flag-based approach
- Ensures cache clears before query processes
- **Pros:** Best UX, keeps auto-retry
- **Cons:** More complex, adds state management

### Option C: Delay Content Script Re-Trigger
- Add small delay before content script re-triggers search
- Give background time to clear cache
```typescript
if (!oldGraphName && newGraphName) {
  setTimeout(() => {
    connect.postMessage({ type: 'query', query: query });
  }, 100); // Wait 100ms for cache clear
}
```
- **Pros:** Simple fix
- **Cons:** Arbitrary delay, not guaranteed, feels hacky

---

## My Recommendation

**Test in this order:**

1. **Run Test 1** - Verify race condition exists (check console timestamps)
2. **If confirmed, run Test 2** - Verify removing auto-retry fixes it
3. **If Test 2 works, implement Option B** - Add synchronization flag for best UX

**Option B** is the most robust because:
- Handles race condition properly
- Keeps the convenient auto-retry
- Doesn't rely on arbitrary delays
- Small code change, low risk

---

## Files That Need Changes

Based on chosen option:

**Option A:**
- `/src/pages/content/LogseqSidekick.tsx` - Remove auto-retry

**Option B:**
- `/src/pages/background/index.ts` - Add flag and check

**Option C:**
- `/src/pages/content/LogseqSidekick.tsx` - Add setTimeout

---

## Questions to Answer

1. Do console logs show cache clear happening AFTER search? (Test 1)
2. Does removing auto-retry fix the issue? (Test 2)
3. Which option gives best balance of UX and reliability?
