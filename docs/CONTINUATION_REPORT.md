# Logseq Copilot HTTP - Development Status Report

## Project Overview

**Goal**: Create a fork of logseq-copilot that works with logseq-http-server instead of the Logseq Plugin API, allowing users to query their Logseq DB graphs without requiring Logseq Desktop to be running.

**Repository Locations**:
- Extension: `/Users/niyaro/Documents/Code/logseq-copilot-http`
- HTTP Server: `/Users/niyaro/Documents/Code/logseq-http-server`

**Current Version**: 0.0.2 (built and ready to test)

## Key Technical Discovery

**Critical Finding**: DB graphs use `:block/title` for content, NOT `:block/content`

The `logseq search` command returns grep-like text output without UUIDs:
```
Search found 11 results:
Sifo paper
Sifo Lakaw 鍾文觀
...
```

The solution is to use `logseq query` with datalog queries that return structured JSON:
```bash
logseq query "GRAPH_NAME" '[:find (pull ?b [:block/uuid :block/title :block/page]) :where [?b :block/title ?title] [(clojure.string/includes? ?title "SEARCH_TERM")]]'
```

This returns proper JSON with UUIDs:
```json
[{
  "block/uuid": "6838d947-a11a-4347-ba23-18739b2f088f",
  "block/title": "Sifo paper",
  "block/page": {"db/id": 808}
}]
```

## Completed Work

### Version 0.0.1
✅ Created fork at `/Users/niyaro/Documents/Code/logseq-copilot-http`
✅ Modified to use HTTP server (localhost:8765) instead of Logseq API (localhost:12315)
✅ Extended types to support DB graph properties (`status`, `tags`, `properties`)
✅ Created `httpServerClient.ts` and `httpServerService.ts`
✅ Added graph selection dropdown instead of text input
✅ Removed Logseq auto-launch behavior (no more `window.location = logseq://graph/...`)
✅ Made extension read-only (removed block editing features)
✅ Fixed build dependency issues (readable-stream)

### Version 0.0.2 (CURRENT - BUILT BUT NOT TESTED)
✅ **Modified HTTP Server** (`/Users/niyaro/Documents/Code/logseq-http-server/logseq_server.py` lines 176-190):
  - Changed `/search` endpoint to use `logseq query` with datalog instead of `logseq search`
  - Query searches `:block/title` (not `:block/content`)
  - Returns structured JSON with UUIDs

✅ **Updated Extension** (`src/pages/logseq/httpServerClient.ts` lines 131-154):
  - Modified `search()` method to parse datalog query results
  - Maps `:block/title` to `:block/content` for backward compatibility
  - Properly extracts UUIDs and page IDs

✅ **Version incremented** from 0.0.1 to 0.0.2 in package.json
✅ **Build succeeded** - extension compiled successfully

## Files Modified in v0.0.2

1. **HTTP Server**:
   - `/Users/niyaro/Documents/Code/logseq-http-server/logseq_server.py` (lines 176-190)

2. **Extension**:
   - `package.json` (version: 0.0.2)
   - `src/pages/logseq/httpServerClient.ts` (search method)

## Current Status: NEEDS TESTING

The extension v0.0.2 is **built but not tested**. The changes should fix the empty search results issue.

## Next Steps (For New Chat Session)

### 1. Restart HTTP Server
```bash
cd /Users/niyaro/Documents/Code/logseq-http-server
# Kill existing server if running (Ctrl+C or kill process)
python3 logseq_server.py
```

### 2. Reload Extension
- Chrome/Edge: Go to `chrome://extensions/` or `edge://extensions/`
- Find "Logseq Copilot HTTP"
- Click the reload icon (🔄)

### 3. Test Search Functionality

**Test A: Direct HTTP Server Test**
```bash
curl "http://localhost:8765/search?q=Sifo&graph=Chrome%20Import%202025-11-09"
```

Expected: JSON with array of blocks containing UUIDs and titles

**Test B: Extension Test**
1. Navigate to Google or another search engine
2. Search for "Sifo" (or any term in your graph)
3. Open browser console (F12)
4. Look for logs:
   - `[Logseq Copilot Content] Received response:`
   - `[HTTP Server Client] Search data:`
5. Expand the response object - check if `blocks` array has items

**Test C: UI Test**
1. Open extension sidebar (should appear on search results page)
2. Verify blocks are displayed with titles
3. Check if status badges appear (for tasks)
4. Try clicking "To Block" links (may not work yet - see Known Issues)

### 4. If Tests Pass
- Update version to 0.0.3 for next iteration
- Consider these enhancements:
  - Add full block details fetching (currently only has title)
  - Implement page search (not just block search)
  - Add filters (by tag, status, etc.)

### 5. If Tests Fail

**If still getting empty blocks:**
1. Check HTTP server response format with curl test
2. Add more logging in `httpServerClient.ts` around line 138-149
3. Verify the datalog query is being constructed correctly (check server logs)

**If getting errors:**
1. Check browser console for JavaScript errors
2. Check HTTP server terminal for Python errors
3. Review the query escaping logic (line 184 in logseq_server.py)

## Known Issues & Limitations

1. **Page links may not work**: `block/page` contains just `{db/id: 808}` but we need page names/titles for display
2. **Read-only mode**: Cannot edit blocks (by design for HTTP server compatibility)
3. **No authentication**: HTTP server runs locally without auth (acceptable for local use)
4. **DB graphs only**: This fork specifically targets DB graphs, not file-based graphs

## Important Code Locations

### HTTP Server Query Construction
File: `/Users/niyaro/Documents/Code/logseq-http-server/logseq_server.py`
Lines: 183-189
```python
escaped_query = query.replace('"', '\\"')
datalog_query = f'[:find (pull ?b [:block/uuid :block/title :block/page]) :where [?b :block/title ?title] [(clojure.string/includes? ?title "{escaped_query}")]]'
response = self._execute_logseq_command('query', [graph, datalog_query])
```

### Extension Result Parsing
File: `src/pages/logseq/httpServerClient.ts`
Lines: 136-149
```typescript
const blocks = Array.isArray(resp.data) ? resp.data : [];
return {
  blocks: blocks.map((block: any) => ({
    'block/uuid': block['block/uuid'] || block.uuid || '',
    'block/content': block['block/title'] || '',
    'block/page': block['block/page']?.['db/id'] || 0,
  })),
  'pages-content': [],
  pages: [],
};
```

## Testing Context

**Test Graph**: "Chrome Import 2025-11-09"
**Test Query**: "Sifo" (known to have 11 results in the graph)

Previous curl test with `logseq search` returned text:
```json
{
  "success": true,
  "stdout": "Search found 11 results:\nSifo paper\nSifo Lakaw...",
}
```

Previous extension test showed:
```
blocks: Array(0)  // Empty!
count: 0
graph: "Chrome Import 2025-11-09"
```

With v0.0.2, we expect:
```
blocks: Array(11)  // Should have 11 items!
graph: "Chrome Import 2025-11-09"
```

## Version History

- **0.0.1**: Initial fork with HTTP server integration, graph dropdown, removed Logseq launch
- **0.0.2**: Fixed search by using datalog queries with `:block/title` (CURRENT - NEEDS TESTING)
- **0.0.3**: (Future) Will be next iteration after successful testing

## Reference Documentation

The @logseq/cli documentation was key to solving this:
- `logseq search` returns grep-like text output
- `logseq query` with datalog returns structured JSON
- DB graphs use `:block/title` not `:block/content`
- Query syntax: `logseq query GRAPH 'DATALOG_QUERY'` (no {:query ...} wrapper for offline use)

## Commands for Quick Reference

**Build extension:**
```bash
cd /Users/niyaro/Documents/Code/logseq-copilot-http
pnpm run build
```

**Start HTTP server:**
```bash
cd /Users/niyaro/Documents/Code/logseq-http-server
python3 logseq_server.py
```

**Test direct query:**
```bash
logseq query "Chrome Import 2025-11-09" '[:find (pull ?b [:block/uuid :block/title :block/page]) :where [?b :block/title ?title] [(clojure.string/includes? ?title "Sifo")]]'
```

**Test HTTP server:**
```bash
curl "http://localhost:8765/search?q=Sifo&graph=Chrome%20Import%202025-11-09"
```

## Summary

We've successfully modified both the HTTP server and the extension to use datalog queries that return structured JSON with UUIDs. The key insight was that DB graphs use `:block/title` for content. Version 0.0.2 is built and ready for testing. The main question now is whether the search results will populate correctly in the extension UI.
