# Logseq Copilot - DB Graph Compatibility Fixes

This fork of [logseq-copilot](https://github.com/EINDEX/logseq-copilot) fixes critical compatibility issues with Logseq DB (database) graphs.

## What Was Fixed

The original extension was experiencing 500 errors and failure to display search results when used with Logseq DB graphs. This fork resolves all these issues.

## Detailed Fix List

### 1. Fixed API Method Names for DB Graphs

**Problem**: The extension was using incorrect Logseq API method names, causing 500 Internal Server errors.

**Files Changed**:
- [src/pages/logseq/client.ts:48-51](src/pages/logseq/client.ts#L48-L51)
- [src/pages/logseq/db/client.ts:46](src/pages/logseq/db/client.ts#L46)
- [src/pages/logseq/db/client.ts:93-96](src/pages/logseq/db/client.ts#L93-L96)

**Changes Made**:
```typescript
// BEFORE
await this.baseJson('logseq.getCurrentGraph', []);

// AFTER
await this.baseJson('logseq.App.getCurrentGraph', []);
```

```typescript
// BEFORE
const isDbGraph = await this.baseJson('logseq.checkCurrentIsDbGraph', []);

// AFTER
const appInfo = await this.baseJson('logseq.App.getAppInfo', []);
return appInfo.supportDb;
```

### 2. Fixed UUID Data Structure Mismatch

**Problem**: Code expected nested UUID structure but API returns flat structure, causing the extension to redirect to config page instead of showing results.

**Files Changed**:
- [src/pages/logseq/db/service.ts:30-46](src/pages/logseq/db/service.ts#L30-L46)

**Changes Made**:
```typescript
// BEFORE
uuid: item['block/uuid']['uuid']

// AFTER
uuid: item.uuid
```

This fix was applied to both page and block processing in the search results.

### 3. Fixed getPage API Method Name

**Problem**: Code was calling non-existent `get_page` method, resulting in "MethodNotExist: get_page" errors.

**Files Changed**:
- [src/pages/logseq/db/client.ts:71](src/pages/logseq/db/client.ts#L71)

**Changes Made**:
```typescript
// BEFORE
await this.baseJson('get_page', [pageIdenity.id || pageIdenity.uuid || pageIdenity.name])

// AFTER
await this.baseJson('logseq.Editor.getPage', [pageIdenity.id || pageIdenity.uuid || pageIdenity.name])
```

## Installation & Setup

### Prerequisites

1. **Logseq with HTTP API enabled**:
   - Open Logseq → Settings → Features
   - Enable "HTTP APIs server"
   - Set an authorization token
   - Note the port (default: 12315)

### Build the Extension

```bash
pnpm install
pnpm run build
```

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `build/chrome-mv3-prod/` directory

### Configure

1. Click the extension icon
2. Enter:
   - **Host**: `localhost`
   - **Port**: `12315`
   - **Token**: Your Logseq API token
3. Click "Test Connection"

## Debugging Tips

If you encounter issues:

1. **Check Logseq HTTP API**: Make sure Logseq is running and HTTP API is enabled
2. **Verify Token**: Ensure the token in extension matches Logseq settings
3. **Check Port**: Default is 12315, verify it matches your Logseq configuration
4. **View Logs**:
   - Right-click extension icon → Inspect to see background logs
   - Open browser console (F12) on Google search page to see content script logs

## Testing

To verify the extension works:

1. Open Logseq with HTTP API enabled
2. Search for something on Google that you know exists in your Logseq graph
3. You should see results from your Logseq graph appear in the sidebar

## Original Repository

Fork of: [EINDEX/logseq-copilot](https://github.com/EINDEX/logseq-copilot)

## License

GPLv3 (same as original)
