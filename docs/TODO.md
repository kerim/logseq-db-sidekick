# Logseq DB Sidekick - Development TODO

**Last Updated**: 2025-11-11 (Night)
**Current Version**: 0.0.15
**Project Location**: `/Users/niyaro/Documents/Code/logseq-copilot-http`
**HTTP Server Location**: `/Users/niyaro/Documents/Code/logseq-http-server`
**GitHub Repo**: https://github.com/kerim/logseq-db-sidekick

## Project Overview

Browser extension that displays relevant Logseq search results while browsing the web. Connects to a local HTTP server to query Logseq DB graphs without requiring Logseq Desktop to run.

**Scope**: Search-only application - shows relevant notes from your Logseq graph alongside web search results (Google, Bing, DuckDuckGo, etc.).

**DB Graphs Only**: This extension exclusively supports Logseq DB (database) graphs. It does NOT support file-based/markdown graphs, as the @logseq/cli only works with DB graphs.

**Key Achievement**: Successfully implemented search with proper EDN-to-JSON conversion and DB graph property support.

---

## Completed Sprints & Current Focus

### ✅ Sprint 1: Core Functionality (Completed)
Phases 0, 1, and 2 - Project setup, page search, and UI fixes

### 🔜 Sprint 2: Enhanced UX (Next)
Phase 3: Floating Button - Replace permanent sidebar with collapsible floating button

### Phase 0: Project Renaming & GitHub Setup ✅ COMPLETED
**Status**: ✅ Completed on 2025-11-10
**Goal**: Rename project from "Logseq Copilot" to "Logseq DB Sidekick" and set up GitHub repo

**Completed Tasks**:
- ✅ Renamed all "Logseq Copilot" → "Logseq DB Sidekick" throughout codebase
- ✅ Updated package.json: name, description, repo URL
- ✅ Renamed component files:
  - `LogseqCopilot.tsx` → `LogseqSidekick.tsx`
  - `LogseqCopliot.tsx` → `LogseqSidekick.tsx`
- ✅ Updated all TypeScript types and function names:
  - `LogseqCopliotConfig` → `LogseqSidekickConfig`
  - `getLogseqCopliotConfig` → `getLogseqSidekickConfig`
  - `saveLogseqCopliotConfig` → `saveLogseqSidekickConfig`
- ✅ Updated CSS class names (copilot → sidekick)
- ✅ Updated all console log messages
- ✅ Updated manifest.json with new extension name
- ✅ Created comprehensive README.md with proper attribution to original Logseq Copilot
- ✅ Committed and pushed all changes
- ✅ Renamed GitHub repo: `logseq-copilot-db-fix` → `logseq-db-sidekick`
- ✅ Updated local git remote URL
- ✅ Version bumped: 0.0.7 → 0.0.8
- ✅ All tests passing

**Key Changes Made**:
- **20 files** modified with systematic renaming
- **README.md** prominently credits original creator (@EINDEX) with links
- **License** maintained as GPLv3 (same as original)
- **GitHub URL**: https://github.com/kerim/logseq-db-sidekick

**Files Changed**:
```
package.json, README.md, src/config.ts, src/manifest.json.cjs
src/components/LogseqCopilot.tsx → LogseqSidekick.tsx
src/pages/content/LogseqCopliot.tsx → LogseqSidekick.tsx
src/pages/content/index.tsx, QuickCapture.tsx, index.module.scss
src/pages/popup/Popup.tsx, index.module.scss
src/pages/options/Options.tsx
src/pages/options/components/Connect.tsx, ClipNote.tsx
src/pages/background/index.ts, upgrade.ts, utils.test.ts
src/pages/logseq/client.ts, httpServerClient.ts
src/components/logseq.module.scss
```

**Last Commit**: "Rename project from Logseq Copilot to Logseq DB Sidekick" (b20d2fb)

---

### Phase 1: Change Search from Blocks to Pages ✅ COMPLETED
**Status**: ✅ Completed on 2025-11-11
**Goal**: Change default search behavior from searching block content to searching page names
**Approach**: Direct implementation with iterative testing

#### What Changed:
- **Before**: Searched for blocks containing the query text (e.g., any note mentioning "taiwan")
- **After**: Searches for pages with the query in their name/title (e.g., page named "Taiwan")

#### Key Discovery:
- User wanted to find **pages** (like "Taiwan Business Bank"), not individual blocks
- Journal filtering was a misunderstanding of the real issue
- Logseq DB stores both `block/name` (lowercase) and `block/title` (original caps)

#### Implementation:
**HTTP Server Changes** (`logseq_server.py`):
- Changed datalog query from searching `:block/title` of blocks
- To searching `:block/name` OR `:block/title` of pages
- Case-insensitive: searches both lowercase name and original title
- Query: `(or [(clojure.string/includes? ?name "query")] [(clojure.string/includes? ?title "Query")])`

**Extension Changes**:
- `src/pages/logseq/httpServerClient.ts` - Transform pages (not blocks) to display format
- `src/pages/logseq/httpServerService.ts` - Removed journal filtering logic, simplified
- Display uses `block/title` (proper capitalization) not `block/name` (lowercase)

**Test Results**:
- Query "taiwan" (lowercase) returns 22 pages
- Query "Taiwan" (capital T) returns same 22 pages
- All pages show proper capitalization (e.g., "Taiwan Business Bank")
- Case-insensitive search confirmed working

**Versions**: 0.0.9 → 0.0.13 (multiple iterations for testing)

---

### Phase 2: Fix UI Display and Navigation ✅ COMPLETED
**Status**: ✅ Completed on 2025-11-11 (Night)
**Goal**: Fix search results display and page navigation issues
**Started**: 2025-11-11 (Evening)

#### Problem Identified:
User reported that clicking page title headers opened Logseq but not to the correct page, while "To Block" links worked correctly. UI also showed duplicate text and redundant "To Block" links.

#### Root Cause:
1. **Wrong URL Format**: Header links used `?page=${name}` format, which doesn't work reliably
2. **Duplicate Content**: `renderBlock()` was being called on page results, creating duplicate text below headers
3. **Redundant UI**: "To Block" link was unnecessary when showing page results

#### Solution Implemented (v0.0.15):
**Files Modified:**
1. **src/components/LogseqPage.tsx** (line 24)
   - Changed from: `?page=${page?.originalName || page?.name}`
   - Changed to: `?block-id=${page.uuid}`
   - Now uses same URL format as working "To Block" links

2. **src/pages/logseq/httpServerService.ts** (lines 37-39)
   - Stopped calling `renderBlock()` on page results
   - Returns pages directly without HTML rendering
   - Eliminates duplicate text generation

3. **src/components/LogseqBlock.tsx** (lines 153-160)
   - Added fallback rendering for pages without html content
   - Shows only the clickable page header link
   - No duplicate text, no "To Block" link for page results

#### Result:
- ✅ Clean list of clickable page titles
- ✅ All page links open Logseq to correct page
- ✅ No duplicate text below headers
- ✅ No redundant "To Block" links
- ✅ User verified: "works great"

**Version**: 0.0.15

---

### Phase 3: Floating Button UX (Major Change)
**Status**: Not Started (Future)
**Goal**: Replace permanent sidebar with floating button showing result count
**Reference**: Unpaywall extension - https://github.com/ourresearch/unpaywall-extension
**Approach**: POC first, then integrate

#### Research Phase:
- [ ] Study Unpaywall extension code for floating button implementation
- [ ] Identify key CSS/HTML structure for collapsible UI
- [ ] Design button states: collapsed (shows count), expanded (shows results)

#### POC Tasks:
- [ ] Create standalone HTML page with floating button demo
- [ ] Implement expand/collapse animation
- [ ] Test positioning (bottom-right corner, stays on screen during scroll)
- [ ] Design result count badge on button
- [ ] Test accessibility (keyboard navigation, screen readers)

#### Integration Tasks:
- [ ] Modify content script (`src/pages/content/index.tsx`)
- [ ] Replace sidebar rendering with floating button component
- [ ] Update CSS styles (`src/pages/content/index.module.scss`)
- [ ] Preserve existing search functionality, only change UI
- [ ] Add user preference to switch between sidebar/floating button (optional)
- [ ] Test on multiple search engines (Google, Bing, DuckDuckGo)

**Key Files**:
- `src/pages/content/index.tsx` - Main content script entry (lines 1-100)
- `src/pages/content/index.module.scss` - Styles
- `src/components/LogseqBlock.tsx` - Block rendering component (reuse)

**Design Specs**:
- Button position: Fixed bottom-right, 20px from edges
- Button size: ~50px diameter when collapsed
- Badge: Small circle showing "3" or "12" result count
- Expand direction: Upward and leftward (to avoid covering content)
- Expanded size: Max 400px width, max 600px height, scrollable
- Animation: Smooth 300ms transition

**POC Location**: `/Users/niyaro/Documents/Code/logseq-copilot-http/poc/floating-button/`

**Version**: Will be 0.1.0 (major UX change)

---

### Phase 4: macOS Background Helper App
**Status**: Not Started (Future)
**Goal**: Make HTTP server run automatically in background on macOS
**Approach**: POC first, then integrate

#### Research Phase:
- [ ] Research macOS LaunchAgents (user-level background services)
- [ ] Study `.app` bundle structure for Python scripts
- [ ] Research status bar (menu bar) apps for Python
- [ ] Investigate `py2app` or similar packaging tools

#### POC Tasks:
- [ ] Create simple LaunchAgent plist file
- [ ] Test manual loading with `launchctl load`
- [ ] Verify server starts automatically at login
- [ ] Create status bar icon POC (shows server status)
- [ ] Add "Quit" option to status bar menu

#### Integration Tasks:
- [ ] Create installer script for LaunchAgent
- [ ] Package Python server as standalone .app (with py2app)
- [ ] Add menu bar icon showing server status (green = running, red = stopped)
- [ ] Add preferences menu (open config, view logs, restart server)
- [ ] Create uninstaller script
- [ ] Write installation guide for macOS

**Key Files**:
- `/Users/niyaro/Documents/Code/logseq-http-server/logseq_server.py` - Main server
- `~/Library/LaunchAgents/com.logseq.sidekick.server.plist` - LaunchAgent config (to be created)
- Server app location: `/Applications/Logseq DB Sidekick Server.app` (future)

**LaunchAgent Plist Structure** (Draft):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.logseq.sidekick.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>/Users/niyaro/Documents/Code/logseq-http-server/logseq_server.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/logseq-server.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/logseq-server-error.log</string>
</dict>
</plist>
```

**POC Location**: `/Users/niyaro/Documents/Code/logseq-copilot-http/poc/macos-helper/`

**Version**: Will be 0.2.0

---

## Key Architecture & Files Reference

### Extension Structure
```
src/
├── pages/
│   ├── content/        # Content script injected into web pages
│   │   ├── index.tsx   # Main entry point for sidebar/floating button
│   │   └── index.module.scss
│   ├── background/     # Service worker (Chrome) / background script (Firefox)
│   │   └── index.ts    # Message passing, state management
│   ├── options/        # Extension settings page
│   │   └── Options.tsx
│   └── popup/          # Extension icon popup
├── components/
│   ├── LogseqBlock.tsx # Block rendering with status badges
│   ├── LogseqConfig.tsx
│   └── LogseqPage.tsx
├── pages/logseq/
│   ├── httpServerClient.ts    # HTTP API client (lines 117-171: search)
│   ├── httpServerService.ts   # Business logic layer (lines 23-43: searchGraph)
│   ├── db/                    # DB graph specific code
│   └── tool.ts                # Block rendering utilities (renderBlock)
├── types/
│   └── logseqBlock.ts  # TypeScript interfaces for blocks and pages
└── config.ts           # Extension configuration storage

Build: build.mjs (esbuild-based build system)
```

### HTTP Server Structure
```
logseq-http-server/
├── logseq_server.py    # Main server (Flask)
│   ├── Lines 94-121:  Command execution with jet (EDN→JSON)
│   ├── Lines 219-221: Search datalog query construction
│   └── Endpoints: /health, /search, /query, /show, /list
└── requirements.txt    # Python dependencies (flask, etc.)

Dependencies: @logseq/cli, jet (brew install borkdude/brew/jet)
```

### Data Flow
1. **User searches** on Google/Bing/etc
2. **Content script** (`content/index.tsx`) detects search, extracts query
3. **Background script** sends message to HTTP server (via `httpServerClient`)
4. **HTTP Server** executes `logseq query` with datalog
5. **@logseq/cli** returns EDN format results
6. **jet** converts EDN → JSON
7. **HTTP Server** returns JSON to extension
8. **httpServerClient** transforms to `LogseqBlockType` format
9. **httpServerService** calls `renderBlock()` to generate HTML
10. **Content script** displays results in UI (sidebar → floating button)

### Build Commands
```bash
# Development build with version
VERSION=0.0.8 pnpm run build

# Watch mode (auto-rebuild)
pnpm run start

# Test server
cd /Users/niyaro/Documents/Code/logseq-http-server
python3 logseq_server.py

# Load extension
Chrome: chrome://extensions/ → Load unpacked → build/chrome/
Firefox: about:debugging → Load Temporary Add-on → build/firefox/manifest.json
```

---

## Version History

- **v0.0.1**: Initial fork with HTTP server integration
- **v0.0.2**: Fixed search using datalog queries
- **v0.0.3-6**: Debugging EDN parsing and data transformation
- **v0.0.7**: Working search with proper DB graph support
- **v0.0.8**: Project renamed to "Logseq DB Sidekick", GitHub repo set up
- **v0.0.9**: Journal page filtering (reverted - wrong approach)
- **v0.0.10**: Changed search from blocks to pages
- **v0.0.11**: Added case-insensitive page search (OR query)
- **v0.0.12**: Testing display of lowercase vs title (reverted)
- **v0.0.13**: Page search with proper title display
- **v0.0.14**: Attempted fix for broken page links (did not resolve - issue more complex)
- **v0.0.15**: **CURRENT** - Fixed page links to use block-id format, removed duplicate UI elements
- **v0.1.0**: (Planned) Floating button UX
- **v0.2.0**: (Planned) macOS background helper app

---

## Common Issues & Solutions

### Issue: Empty Search Results
**Symptom**: `blocks: Array(0)`, count: 0
**Solution**: Ensure `jet` is installed (`brew install borkdude/brew/jet`)
**File**: `logseq-http-server/logseq_server.py` (lines 94-121)

### Issue: "Cannot read properties of undefined (reading 'name')"
**Symptom**: JavaScript error in console
**Solution**: Check datalog query includes nested page pull: `{:block/page [:db/id :block/uuid :block/title :block/name]}`
**File**: `logseq-http-server/logseq_server.py` (line 221)

### Issue: Blocks Not Rendering (have length but no display)
**Symptom**: Blocks array has items but nothing shows in UI
**Solution**: Check property names match TypeScript interface (use `uuid`, `content`, not `'block/uuid'`, `'block/content'`)
**File**: `src/pages/logseq/httpServerClient.ts` (lines 144-157)

### Issue: Version Shows 0.0.0
**Symptom**: Extension manifest shows wrong version
**Solution**: Pass VERSION env var: `VERSION=0.0.8 pnpm run build`
**File**: `build.mjs` (line 17)

---

## Testing Checklist (Before Each Release)

- [ ] Extension builds without errors
- [ ] HTTP server starts without errors
- [ ] Search returns results for known query
- [ ] Results display correctly in UI
- [ ] Status badges show for tasks (blue/orange/green)
- [ ] Tags display as badges
- [ ] "To Block" links work (open Logseq)
- [ ] Graph name displays correctly
- [ ] No JavaScript errors in console
- [ ] Version number correct in manifest
- [ ] Works on Google search results page
- [ ] Works on at least one other search engine

**Test Graph**: "Chrome Import 2025-11-09"
**Test Query**: "sifo" (expected: 6 results)
**Test URL**: http://localhost:8765/search?q=sifo&graph=Chrome%20Import%202025-11-09

---

## POC Development Guidelines

Before implementing any major feature:
1. Create POC directory: `/Users/niyaro/Documents/Code/logseq-copilot-http/poc/[feature-name]/`
2. Build minimal working prototype
3. Test thoroughly in isolation
4. Document findings in `poc/[feature-name]/NOTES.md`
5. Only then integrate into main codebase
6. Increment version number appropriately

**Example POC Structure**:
```
poc/
├── floating-button/
│   ├── demo.html       # Standalone demo page
│   ├── styles.css      # Styling
│   ├── script.js       # Behavior
│   └── NOTES.md        # Implementation notes
└── macos-helper/
    ├── logseq-server.plist
    ├── install.sh
    └── NOTES.md
```

---

## Git Workflow

After completing each phase:
```bash
# Commit changes
git add .
git commit -m "feat: [description of feature]"

# Update version
VERSION=0.0.X pnpm run build

# Tag release
git tag v0.0.X -m "Release version 0.0.X"
git push origin main
git push --tags

# Update this TODO.md
# Mark phase as complete with ✅
# Move to next phase
```

---

## Resources & References

**Original Project**: https://github.com/eindex/logseq-copilot (forked from)
**HTTP Server**: https://github.com/kerim/logseq-http-server
**Logseq CLI Docs**: https://github.com/logseq/logseq/tree/master/packages/cli
**Unpaywall Extension**: https://github.com/ourresearch/unpaywall-extension (UX reference for floating button)
**macOS LaunchAgents**: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html

**Related Documentation**:
- `README.md` - Project overview
- `README-HTTP.md` - HTTP server integration details
- `DB-GRAPH-SUPPORT.md` - DB graph implementation details
- `CONTINUATION_REPORT.md` - Development history (v0.0.1 to v0.0.2)
- `TROUBLESHOOTING_REPORT.md` - Debugging journey (v0.0.2 to v0.0.7)

---

## Notes for Future Chat Sessions

### If Continuing Tomorrow (2025-11-12 or later)

**What Was Just Completed** (2025-11-11 night session):
- ✅ **Phase 2 Complete**: Fixed UI display and page navigation
- ✅ Changed page links to use `?block-id=${uuid}` format (works correctly)
- ✅ Removed duplicate content display below headers
- ✅ Removed redundant "To Block" links for page results
- ✅ Clean, minimal UI showing just clickable page titles
- ✅ Version bumped to 0.0.15
- ✅ User tested and verified: "works great"

**Next Task to Work On**:
👉 **Phase 3: Floating Button UX** (see Phase 3 section above)

This is a MAJOR UX change - replacing the permanent sidebar with a collapsible floating button (like Unpaywall extension). Follow POC-first approach:
1. Study Unpaywall extension code
2. Create standalone POC in `poc/floating-button/`
3. Test thoroughly before integrating
4. Will be version 0.1.0 (major UX change)

**Starting Fresh in a New Chat**:
1. ✅ Read this TODO.md first (you're doing it!)
2. Check current version: `cat package.json | grep version` → should be 0.0.15
3. Verify git status: `git log --oneline -5` → last commit should be "Fix page navigation..."
4. Review "Phase 3: Floating Button UX" above for next tasks
5. **Remember**: POC first, then integrate (follow POC Development Guidelines)

**Quick Status Check**:
```bash
cd /Users/niyaro/Documents/Code/logseq-copilot-http
cat package.json | grep version  # Should show 0.0.15
git log --oneline -3              # Should see navigation fix commit
git remote -v                     # Should show logseq-db-sidekick repo
```

**Important Context**:
- **Core functionality is now solid**: Project renamed, page search working, UI clean and functional
- Extension works with HTTP server at http://localhost:8765
- Only supports DB graphs (not file-based graphs)
- Search-only focus (no editing/capture features)
- Ready for major UX enhancement (floating button)
