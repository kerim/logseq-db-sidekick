# Alert Button Workflow Fix - Version 0.0.38

## Problem Description

### Broken User Flow
1. User removes/installs plugin OR plugin loads on fresh browser without config
2. User searches (e.g., "taiwan" on Google/Kagi)
3. Plugin shows alert button ⚠️ (correct behavior)
4. User clicks alert → opens settings → configures graph name
5. **BUG**: Button changes to show "0" results, clicking does nothing
6. **Workaround**: Reloading the plugin makes it work correctly

### Expected Behavior
After configuring the graph in step 4, the button should:
- Show the correct result count (e.g., "22" for taiwan search)
- Clicking should open the side panel with results

### Why It Works on Reload
When user reloads the plugin:
- Component initializes with graph already configured in storage
- First search query uses the configured graph
- Results come back correctly

## Root Cause Analysis

### What Changed
Before implementing the alert button feature, there was no search attempt when graph wasn't configured. The plugin would either show an error or skip initialization.

After adding the alert button, we:
- Always show a button (alert or count)
- Attempt search even without config
- This creates a "failed state" that persists

### Technical Flow (Broken)

```
1. Component mounts on search page
   - graphName state = '' (not loaded from storage yet)
   - Sends query to background: { type: 'query', query: 'taiwan' }

2. Background script attempts search
   - No graph configured → returns 0 results or error
   - Component receives: { msg: 'error', response: { pages: [], blocks: [] } }
   - State: logseqSearchResult = { pages: [], blocks: [], count: 0 }
   - UI: Shows alert button ⚠️

3. User clicks alert, configures graph to "Chrome Import 2025-11-09"
   - Settings page calls saveLogseqSidekickConfig({ graphName: "..." })
   - Browser.storage.local updates

4. Storage change event fires in content script
   - handleStorageChange() detects graphName changed
   - Calls loadConfig() → updates graphName state to "Chrome Import..."
   - hasGraphConfigured = true
   - Button changes from ⚠️ to "0"

5. **PROBLEM**: Component still has old failed search results
   - logseqSearchResult still = { pages: [], blocks: [], count: 0 }
   - No new query sent to background
   - Button shows "0", clicking opens empty panel (actually won't open, no results)
```

### Why This Happens
The storage change handler only updates the `graphName` state but doesn't trigger a new search:

```typescript
const handleStorageChange = (changes: any, areaName: string) => {
  if (areaName === 'local' && (changes.graphName || changes.theme)) {
    loadConfig();  // Updates state but doesn't re-query
  }
};
```

## The Fix

### What It Does
Detect when graph is configured for the first time and automatically re-run the current search.

### Implementation
```typescript
const handleStorageChange = (changes: any, areaName: string) => {
  if (areaName === 'local' && changes.graphName) {
    const oldGraphName = changes.graphName.oldValue;
    const newGraphName = changes.graphName.newValue;

    // Reload config to update state
    loadConfig();

    // If graph was just configured (empty -> non-empty), re-trigger search
    if (!oldGraphName && newGraphName) {
      // Extract current search query from URL
      const searchParams = new URLSearchParams(window.location.search);
      const query = searchParams.get('q');

      if (query) {
        // Send new search request with configured graph
        connect.postMessage({ type: 'query', query: query });
      }
    }
  }
};
```

### Expected Flow After Fix
```
1-4. [Same as before - user configures graph]

5. Storage change handler detects graph configured
   - Updates graphName state
   - Detects: oldValue = undefined/empty, newValue = "Chrome Import..."
   - Extracts current query from URL: ?q=taiwan
   - Sends new query: connect.postMessage({ type: 'query', query: 'taiwan' })

6. Background script processes query with configured graph
   - Searches Logseq with graph = "Chrome Import 2025-11-09"
   - Returns: { msg: 'success', response: { pages: [...], blocks: [...] } }

7. Component receives new results
   - logseqSearchResult updates with 22 results
   - count = 22
   - Button shows "22"
   - Clicking opens panel with results ✓
```

## Testing Scenarios

### Scenario A: Fresh Install (Primary Fix Target)
1. Remove plugin, reinstall
2. Search "taiwan" → alert button ⚠️ appears
3. Click alert → configure graph
4. **Expected**: Button immediately shows "22", clicking opens panel

### Scenario B: Already Configured
1. Plugin already has graph configured
2. Search "taiwan"
3. **Expected**: Button shows "22" immediately, no alert

### Scenario C: Change Graph Name
1. Plugin configured with "Graph A"
2. Search "taiwan" → shows results from Graph A
3. Change graph to "Graph B" in settings
4. **Expected**: Results update to Graph B (may need page refresh)

### Scenario D: Clear Graph Name
1. Plugin configured
2. Clear graph name in settings (set to empty)
3. **Expected**: Alert button ⚠️ appears

## Potential Issues

### Issue 1: Race Condition
If config loads slowly, the check for `!oldGraphName` might not work correctly.
**Mitigation**: The storage change event includes both old and new values, so comparison is reliable.

### Issue 2: URL Query Parameter Format
Different search engines use different URL patterns:
- Google: `?q=taiwan`
- DuckDuckGo: `?q=taiwan`
- Kagi: `?q=taiwan`
Most use `q` parameter, but we should verify across engines.

### Issue 3: Multiple Storage Changes
If user changes multiple settings at once, multiple storage events fire.
**Mitigation**: The condition `!oldGraphName && newGraphName` only triggers on first-time config.

## Files Modified
- `/src/pages/content/LogseqSidekick.tsx` - Storage change handler

## Version
- Fix implemented in: 0.0.38
- Previous broken version: 0.0.37

## Rollback Plan
If fix causes issues:
1. Revert storage change handler to simple config reload
2. Add UI hint: "Please refresh page after configuring"
3. Consider alternative: auto-refresh page after config save
