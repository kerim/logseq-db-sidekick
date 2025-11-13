# Alert Button Workflow - Cache Hypothesis & Testing Plan

## Problem Context

### Working Scenario
1. Plugin installed with config already set
2. User searches → Plugin works correctly
3. Results display properly

### Broken Scenario
1. Plugin installed without config (or config cleared)
2. User searches → Alert button ⚠️ appears
3. User clicks alert → Configures graph name in settings
4. Button changes to show "0" results
5. Clicking button does nothing (panel won't open)
6. **Only way to fix:** Reload the plugin

### Key Evidence from Console Logs
```
[Logseq DB Sidekick] Sending query to background: sifo
[Logseq DB Sidekick] Received response:
  msg: "Graph name not configured. Please set it in extension options."
  status: 500
[Config] Loaded config:
  graphName: "Chrome Import 2025-11-09"  ← Config EXISTS!
```

**The mystery:** Background says "not configured" but storage HAS the config!

---

## Three Hypotheses

### Hypothesis A: HttpServerClient Caches Config and Never Refreshes

#### Evidence from Code

**File:** `/src/pages/logseq/httpServerClient.ts` (lines 43-61)

```typescript
export default class HttpServerClient implements LogseqClientInterface {
  private serverUrl: string = '';        // ← Instance variable
  private graphName: string = '';        // ← Instance variable

  private async getConfig() {
    if (!this.serverUrl) {               // ← ONLY loads if empty!
      const config = await getLogseqSidekickConfig();
      const hostname = config.logseqHostName || 'localhost';
      const port = config.logseqPort || 8765;
      this.serverUrl = `http://${hostname}:${port}`;
      this.graphName = config.graphName || '';
    }
    return { serverUrl: this.serverUrl, graphName: this.graphName };
  }
}
```

**File:** `/src/pages/logseq/tool.ts` (line 7)
```typescript
const httpServerService = new HttpServerService();  // ← Single instance
```

**File:** `/src/pages/logseq/httpServerService.ts` (line 7)
```typescript
export default class HttpServerService implements LogseqServiceInterface {
  public client: HttpServerClient = new HttpServerClient();  // ← Single instance
}
```

#### Why This Causes the Bug

**Broken Flow:**
1. Background script loads → Creates ONE HttpServerClient instance (lives forever)
2. First search without config:
   - `getConfig()` called
   - `this.serverUrl` is empty → loads config
   - `config.graphName` is empty → caches `this.graphName = ''`
   - `this.serverUrl = 'http://localhost:8765'` (now set!)
3. User configures graph in settings (storage updates)
4. Second search after config:
   - `getConfig()` called again
   - **Checks `if (!this.serverUrl)`** → FALSE (already set from step 2!)
   - **Skips loading config entirely**
   - Returns cached empty graphName → ERROR!

**Working Flow:**
1. Background script loads with existing config
2. First search:
   - `getConfig()` loads config with actual graphName → caches it
   - All future searches use cached value → works!

#### Testing Plan for Hypothesis A

**Test 1.1: Confirm cache is the issue**

Add logging to `httpServerClient.ts` line 47:
```typescript
private async getConfig() {
  console.log('[CACHE TEST] this.serverUrl before check:', this.serverUrl);
  console.log('[CACHE TEST] this.graphName before check:', this.graphName);

  if (!this.serverUrl) {
    console.log('[CACHE TEST] Loading config from storage...');
    const config = await getLogseqSidekickConfig();
    this.serverUrl = `http://${hostname}:${port}`;
    this.graphName = config.graphName || '';
    console.log('[CACHE TEST] Cached graphName:', this.graphName);
  } else {
    console.log('[CACHE TEST] Using cached values (NOT reloading from storage)');
  }

  return { serverUrl: this.serverUrl, graphName: this.graphName };
}
```

**Steps:**
1. Build and reload plugin
2. Clear config (set graphName to empty)
3. Do search → Check console for "Loading config from storage..."
4. Configure graph in settings
5. Do another search → **Expected:** "Using cached values (NOT reloading from storage)"
6. Check if graphName is still empty in the log

**Expected Result:** If Hypothesis A is correct, second search will show cached empty graphName.

---

**Test 1.2: Fix by removing cache**

Change `getConfig()` to ALWAYS reload:
```typescript
private async getConfig() {
  console.log('[CACHE FIX] Always reloading config from storage');
  const config = await getLogseqSidekickConfig();
  const hostname = config.logseqHostName || 'localhost';
  const port = config.logseqPort || 8765;
  this.serverUrl = `http://${hostname}:${port}`;
  this.graphName = config.graphName || '';
  console.log('[CACHE FIX] Loaded graphName:', this.graphName);
  return { serverUrl: this.serverUrl, graphName: this.graphName };
}
```

**Steps:**
1. Build with fix
2. Test broken scenario (no config → search → configure → search again)
3. **Expected:** Should work! Second search should find config.

**If this fixes it:** Hypothesis A is CONFIRMED.

---

### Hypothesis B: Background Script Doesn't Listen for Storage Changes

#### Evidence from Code

**File:** `/src/pages/background/index.ts`

Looking through the entire file (203 lines), there is **NO** storage change listener:
- No `Browser.storage.onChanged.addListener()`
- Background script creates HttpServerService once on load
- No way to know when settings change

**Content script DOES have storage listener:**
- `/src/pages/content/LogseqSidekick.tsx` line 44 has `Browser.storage.onChanged.addListener()`
- But background script is separate and unaware

#### Why This Causes the Bug

1. Background loads → Creates HttpServerService with cached empty graphName
2. User configures graph → Storage changes
3. Content script detects change (has listener)
4. But background script doesn't detect change (no listener)
5. Next search → Background still uses old cached graphName

#### Testing Plan for Hypothesis B

**Test 2.1: Confirm no listener exists**

Check if storage changes reach background:

Add to `/src/pages/background/index.ts` after line 9:
```typescript
console.log('[Logseq DB Sidekick] Background script loaded');

// TEST: Listen for storage changes
Browser.storage.onChanged.addListener((changes, areaName) => {
  console.log('[STORAGE TEST BACKGROUND] Storage changed!', changes, areaName);
});
```

**Steps:**
1. Build and reload plugin
2. Configure graph in settings
3. Check background service worker console (chrome://extensions → Logseq DB Sidekick → service worker → inspect)
4. **Expected:** Should see "[STORAGE TEST BACKGROUND] Storage changed!" if listener works

**If no log appears:** Storage changes don't reach background (confirms listener is needed)

---

**Test 2.2: Fix by adding storage listener**

Add after line 9 in `/src/pages/background/index.ts`:
```typescript
// Listen for config changes and invalidate cache
Browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.graphName) {
    console.log('[Background] Graph name changed, clearing HTTP client cache');
    // Force httpServerService to create new client on next search
    httpServerService.client = new HttpServerClient();
  }
});
```

**Steps:**
1. Build with fix
2. Test broken scenario
3. **Expected:** After configuring graph, next search should work

**If this fixes it:** Hypothesis B is CONFIRMED (may work in conjunction with Hypothesis A).

---

### Hypothesis C: Cache is Intentional but Needs Invalidation Method

#### Evidence from Code

The caching in `httpServerClient.ts` appears intentional:
- Performance optimization: Avoid reading storage on every search
- Common pattern for long-lived service instances
- But lacks cache invalidation mechanism

#### Why This Causes the Bug

The optimization is sound, but incomplete:
1. Cache avoids unnecessary storage reads ✓
2. Works fine when config doesn't change ✓
3. But config CAN change (user updates settings) ✗
4. No way to tell the client "config changed, reload" ✗

#### Testing Plan for Hypothesis C

**Test 3.1: Add invalidation method**

Add to `HttpServerClient` class in `/src/pages/logseq/httpServerClient.ts`:
```typescript
export default class HttpServerClient implements LogseqClientInterface {
  private serverUrl: string = '';
  private graphName: string = '';

  // Add this method
  public clearCache() {
    console.log('[HTTP Server Client] Cache cleared');
    this.serverUrl = '';
    this.graphName = '';
  }

  private async getConfig() {
    // ... existing code
  }
}
```

Then in `/src/pages/background/index.ts`, add storage listener:
```typescript
Browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.graphName || changes.logseqHostName || changes.logseqPort)) {
    console.log('[Background] Config changed, invalidating cache');
    const logseqService = await getLogseqService();
    logseqService.client.clearCache();
  }
});
```

**Steps:**
1. Build with fix
2. Test broken scenario
3. **Expected:** Cache clears when config changes, next search reloads config

**If this fixes it:** Hypothesis C is CONFIRMED.

---

## Implementation Priority

Based on code structure and likelihood:

1. **Start with Hypothesis A** - Most likely culprit
   - Clear evidence of caching behavior
   - Explains the exact symptoms
   - Simple to test

2. **Then test Hypothesis B** - Related issue
   - Background definitely lacks storage listener
   - May be needed even if A is fixed
   - Affects other config changes too (port, hostname)

3. **Finally consider Hypothesis C** - Best long-term solution
   - Keeps performance optimization
   - Adds proper cache management
   - More elegant than removing cache entirely

## Recommended Fix Strategy

If Hypothesis A + B are both correct (most likely):

**Immediate fix:**
- Remove caching from `getConfig()` (always reload)
- Simple, reliable, small performance cost

**Better fix:**
- Add `clearCache()` method to HttpServerClient
- Add storage listener in background script
- Keeps optimization, adds invalidation

## Files to Modify

1. `/src/pages/logseq/httpServerClient.ts` - Fix caching behavior
2. `/src/pages/background/index.ts` - Add storage listener
3. `/src/pages/logseq/httpServerService.ts` - May need changes depending on approach

## Testing Checklist

After implementing fix:

- [ ] Fresh install without config → Alert works → Configure → Search works
- [ ] Fresh install with config → Search works immediately
- [ ] Change graph name in settings → New searches use new graph
- [ ] Change port/hostname → New searches use new endpoint
- [ ] Reload plugin → Still works
- [ ] Multiple searches in a row → All work consistently

## Version History

- 0.0.37: Alert button always visible (introduced bug with config change)
- 0.0.38: Attempted fix with storage listener in content script (didn't work)
- Next: Fix caching in background script's HttpServerClient

## Related Documentation

- `/docs/ALERT_BUTTON_FIX.md` - Initial analysis (missed the caching issue)
- `/docs/COMPLETE_FIX_DOCUMENTATION_v0.0.017.md` - Original fixes applied to this codebase
