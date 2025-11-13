# Changelog - Version 0.0.40

**Release Date:** 2025-11-13

## Summary

Fixed critical bug where the alert button workflow failed after initial configuration. The root cause was a config caching issue combined with an unnecessary auto-retry workaround that created race conditions.

## Bug Fixed: Alert Button Configuration Workflow

### The Problem

**Broken Workflow (v0.0.37-0.0.39):**
1. Plugin installed without config → User searches → Alert button ⚠️ appears
2. User clicks alert → Configures graph name in settings → Saves
3. User searches again → Button shows "0" but clicking does nothing
4. **Only fix:** Reload the entire plugin

**Root Cause:** Config caching in HttpServerClient prevented updated settings from being loaded.

### The Solution

Implemented proper cache invalidation with two key changes:

#### 1. Added Cache Invalidation Method
**File:** `src/pages/logseq/httpServerClient.ts`

```typescript
public clearCache() {
  console.log('[HTTP Server Client] Cache cleared - will reload config on next request');
  this.serverUrl = '';
  this.graphName = '';
}
```

#### 2. Added Storage Change Listener in Background Script
**File:** `src/pages/background/index.ts`

```typescript
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.graphName || changes.logseqHostName || changes.logseqPort) {
      console.log('[Logseq DB Sidekick] Config changed, clearing HTTP client cache');
      getLogseqService().then((service) => {
        service.client.clearCache();
      });
    }
  }
});
```

#### 3. Removed Unnecessary Auto-Retry Workaround
**File:** `src/pages/content/LogseqSidekick.tsx`

Removed 15 lines of code that automatically re-triggered searches when config changed. This workaround:
- Was added in v0.0.38 to work around the cache issue
- Never actually fixed the problem
- Created race conditions with the proper cache invalidation
- Is no longer needed

#### 4. Enhanced Debug Logging
Added comprehensive logging to help diagnose issues:
- Button click events
- Storage change detection
- Cache invalidation timing
- Config reload operations

### Working Workflow (v0.0.40)

1. Plugin installed without config → User searches → Alert button ⚠️ appears
2. User clicks alert → **Settings page opens automatically**
3. User configures graph name → Saves → **Cache invalidates**
4. User searches again → **Button shows results, panel opens correctly**

## Technical Details

### Cache Strategy

The HttpServerClient uses lazy loading with caching:

```typescript
private async getConfig() {
  if (!this.serverUrl) {  // Only load if cache empty
    const config = await getLogseqSidekickConfig();
    this.serverUrl = `http://${hostname}:${port}`;
    this.graphName = config.graphName || '';
  }
  return { serverUrl: this.serverUrl, graphName: this.graphName };
}
```

**Benefits:**
- Avoids reading storage on every search (performance)
- Single source of truth per session

**Challenge:**
- Must invalidate cache when settings change
- Background script (where HttpServerClient lives) doesn't automatically know about storage changes

**Solution:**
- Storage listener in background script explicitly calls `clearCache()`
- Next search loads fresh config from storage

### Why Auto-Retry Was Problematic

The auto-retry created a race condition:

```
T=0:   User saves graph name → Storage updated
T=1:   Content script listener fires → Re-triggers search
T=2:   Background receives search request
T=3:   Background calls getConfig() → Returns CACHED empty graphName
T=4:   Search fails
T=10:  Background listener fires → clearCache() (too late!)
```

The content script's search happened before the background script could clear the cache, so it used stale data.

## Files Modified

### Core Fixes
- `src/pages/logseq/httpServerClient.ts` - Added clearCache() method
- `src/pages/background/index.ts` - Added storage listener for cache invalidation
- `src/pages/content/LogseqSidekick.tsx` - Removed auto-retry workaround, enhanced logging

### Version Update
- `package.json` - Updated version to 0.0.40

## Testing Performed

### Test Scenario: First-Time Configuration
1. ✅ Fresh install without config
2. ✅ Search triggers alert button ⚠️
3. ✅ Click alert opens settings page
4. ✅ Configure graph name
5. ✅ Search again shows results
6. ✅ Panel opens correctly

### Test Scenario: Config Update
1. ✅ Change graph name in settings
2. ✅ Cache invalidates automatically
3. ✅ Next search uses new graph name
4. ✅ Results reflect new configuration

### Test Scenario: Port/Hostname Update
1. ✅ Change port or hostname in settings
2. ✅ Cache invalidates automatically
3. ✅ Next search uses new connection settings

## Related Documentation

- `docs/ALERT_BUTTON_CACHE_HYPOTHESIS.md` - Original analysis of the caching bug
- `docs/ALERT_BUTTON_FIX.md` - Initial fix attempts (superseded)
- `docs/ALERT_BUTTON_RACE_CONDITION_ANALYSIS.md` - Analysis of race condition with auto-retry
- `docs/CONTINUATION_REPORT.md` - Earlier debugging notes
- `docs/TROUBLESHOOTING_REPORT.md` - General troubleshooting guide

## Breaking Changes

None - this is a bug fix release.

## Known Limitations

- After configuring graph name for the first time, user must manually search again (auto-retry removed)
- This is intentional to avoid race conditions
- UX is slightly worse but reliability is significantly better

## Migration Notes

No migration needed. Users on v0.0.37-0.0.39 can upgrade directly.

## Version History

- **v0.0.37:** Alert button introduced but clicking after config did nothing
- **v0.0.38:** Added auto-retry workaround (didn't fix root cause)
- **v0.0.39:** Added cache invalidation but kept auto-retry (race condition)
- **v0.0.40:** Removed auto-retry, proper cache invalidation works ✅
