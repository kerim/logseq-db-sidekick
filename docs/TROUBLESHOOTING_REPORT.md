# Logseq Copilot HTTP - Troubleshooting Report
## Session Date: 2025-11-10

### Project Context
Fork of logseq-copilot to work with logseq-http-server instead of Logseq Plugin API, enabling queries to Logseq DB graphs without requiring Logseq Desktop to be running.

**Repository**: `/Users/niyaro/Documents/Code/logseq-copilot-http`
**HTTP Server**: `/Users/niyaro/Documents/Code/logseq-http-server`
**Final Version**: 0.0.7

---

## Problem 1: Empty Search Results (Blocks Array Length = 0)

### Symptoms
- Extension connected successfully
- HTTP server returned 200 status
- Console showed: `blocks: Array(0)`, `count: 0`
- No results displayed in UI

### Root Cause
The logseq CLI `query` command outputs **EDN format** (Clojure's data notation), not JSON. The HTTP server was returning raw EDN as a string in the `stdout` field, which couldn't be parsed as JSON.

**Example of EDN output:**
```edn
{:block/page {:db/id 2742},
 :block/title "sifolakaw@gmail.com",
 :block/uuid #uuid "6838ddea-4496-48f4-8724-94050c2c2190"}
```

### Solution
1. **Installed `jet` CLI tool** - A tool specifically designed to convert EDN to JSON
   ```bash
   brew install borkdude/brew/jet
   ```

2. **Modified HTTP Server** (`logseq_server.py` lines 94-121)
   - Added logic to pipe `logseq query` output through `jet --to json` for query commands
   - Used subprocess.Popen to create a pipeline: `logseq query | jet --to json`
   - This converts EDN output to proper JSON automatically

**Key Learning**: Don't write custom parsers when existing tools solve the problem. `jet` is the standard tool for EDN-to-JSON conversion.

---

## Problem 2: TypeError "Cannot read properties of undefined (reading 'name')"

### Symptoms
- Blocks array now had 6 items (progress!)
- JavaScript error: `Cannot read properties of undefined (reading 'name')` at `LogseqCopilot.tsx:17`
- Error occurred in `blocks.reduce()` trying to access `item.page.name`

### Root Cause
The datalog query was only pulling basic page info (`db/id`) without the page's name or title. The component expected:
```javascript
block.page.name  // This was undefined
```

### Investigation Steps
1. Tested HTTP server directly with curl - confirmed page object was incomplete
2. Checked what the datalog query was requesting
3. Found the query needed nested pull syntax to fetch page details

### Solution
1. **Updated Datalog Query** (`logseq_server.py` line 221)
   - Changed from: `[:block/uuid :block/title :block/page]`
   - Changed to: `[:block/uuid :block/title {:block/page [:db/id :block/uuid :block/title :block/name]}]`
   - The `{:block/page [...]}` syntax tells datalog to pull nested attributes

2. **Updated Extension Transformation** (`httpServerClient.ts` lines 142-157)
   - Mapped EDN keys to JavaScript object:
   ```javascript
   page: {
     id: page['db/id'] || 0,
     uuid: page['block/uuid'] || '',
     name: page['block/title'] || page['block/name'] || 'Unknown Page',
     originalName: page['block/name'] || '',
   }
   ```

**Key Learning**: Datalog nested pull syntax `{:attribute [:nested-attr1 :nested-attr2]}` is essential for fetching related entity data.

---

## Problem 3: Transformation Code Not Executing

### Symptoms
- Added detailed logging to `httpServerClient.ts` but logs never appeared
- Blocks still had wrong structure
- Error persisted despite code changes

### Root Cause Discovery Process
1. Traced execution path through background script
2. Found `httpServerService.ts` `searchGraph()` method was calling `getBlock()` for each UUID
3. This made additional API calls and **threw away the properly formatted blocks** from the search response

**The culprit** (`httpServerService.ts` lines 36-42 - OLD CODE):
```javascript
response.blocks = await Promise.all(
  resp.blocks
    .filter((item: any) => !item['page?'])
    .map(async (item: any) => {
      const uuid = item['block/uuid'] || item.uuid;
      return await this.getBlock(uuid, graphName, query);  // ❌ Discarding transformed blocks!
    }),
);
```

### Solution
**Removed unnecessary API calls** (`httpServerService.ts` lines 34-40 - NEW CODE):
```javascript
response.blocks = resp.blocks
  .filter((item: any) => !item['page?'])
  .map((item: any) => {
    return renderBlock(item, graphName, query);  // ✓ Use blocks directly
  });
```

**Key Learning**: When debugging, trace the full execution path. Middleware layers can silently override earlier transformations.

---

## Problem 4: Blocks Still Not Rendering (length: 6 but nothing displayed)

### Symptoms
- Blocks array had correct length (6 items)
- No JavaScript errors
- Nothing displayed in UI
- Graph name now showed correctly

### Root Cause
Property naming mismatch between transformation and TypeScript interface.

**Transformation created** (`httpServerClient.ts` - WRONG):
```javascript
{
  'block/uuid': '...',       // ❌ Wrong property name
  'block/content': '...',    // ❌ Wrong property name
  page: { ... }
}
```

**Interface expected** (`types/logseqBlock.ts`):
```typescript
export type LogseqBlockType = {
  uuid: string;      // ✓ Simple property name
  content: string;   // ✓ Simple property name
  page: LogseqPageIdenity;
  html: string;
  // ...
}
```

**Why it mattered**: The `renderBlock()` function calls `cleanBlock(block)`, which accesses `block.content`. With the property named `'block/content'`, it couldn't find the content, so no HTML was generated. The UI component only renders blocks with `block.html` set (line 113 in `LogseqBlock.tsx`).

### Solution
**Fixed property names** (`httpServerClient.ts` lines 144-157):
```javascript
{
  uuid: block['block/uuid'] || block.uuid || '',  // ✓ Correct
  content: block['block/title'] || '',             // ✓ Correct
  page: { ... },
  html: '',
  format: 'markdown',
  marker: '',
  priority: '',
}
```

**Key Learning**: When data isn't flowing through the pipeline, check property naming conventions. TypeScript interfaces document the expected structure - use them!

---

## Key Architectural Insights

### Data Flow Pipeline
1. **HTTP Server** receives search request
2. **Logseq CLI** executes datalog query → returns EDN
3. **jet** converts EDN → JSON
4. **HTTP Server** sends JSON to extension
5. **httpServerClient** transforms to LogseqBlockType format
6. **httpServerService** calls renderBlock on each
7. **renderBlock** generates HTML from markdown
8. **UI Component** renders blocks with HTML

### Critical Files
- **HTTP Server Query**: `/Users/niyaro/Documents/Code/logseq-http-server/logseq_server.py` (lines 94-121, 219-221)
- **Data Transformation**: `src/pages/logseq/httpServerClient.ts` (lines 131-165)
- **Service Layer**: `src/pages/logseq/httpServerService.ts` (lines 23-43)
- **Type Definitions**: `src/types/logseqBlock.ts`
- **UI Component**: `src/components/LogseqBlock.tsx` (line 113 checks for `block.html`)

### Version Numbering
Always pass VERSION env var to build: `VERSION=0.0.X pnpm run build`
Otherwise defaults to 0.0.0 in manifest.json.

---

## Debugging Methodology That Worked

1. **Test HTTP endpoint directly with curl** - Isolated server vs client issues
2. **Trace execution path through all layers** - Don't assume transformations persist
3. **Check TypeScript interfaces** - Property naming must match exactly
4. **Use existing tools** - Don't write custom parsers (jet for EDN)
5. **Understand the data format** - Logseq CLI outputs EDN, not JSON
6. **Look for silently discarded data** - Middleware may override earlier work

---

## What NOT To Do Next Time

1. ❌ Don't write custom EDN parsers - use `jet`
2. ❌ Don't assume transformation code is executing without verifying logs appear
3. ❌ Don't make additional API calls when data is already in the response
4. ❌ Don't use property names with special characters (`'block/uuid'`) when interface expects simple names
5. ❌ Don't skip checking TypeScript interfaces - they document expected structure
6. ❌ Don't forget to pass VERSION env var when building

---

## Success Criteria Met

✅ Extension connects to HTTP server
✅ Search returns 6 results for "sifo" query
✅ Results display with proper page names
✅ Graph name shows correctly in UI
✅ No JavaScript errors in console
✅ Version number displays correctly (0.0.7)
