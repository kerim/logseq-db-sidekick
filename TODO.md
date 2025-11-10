# Logseq DB Sidekick - Development TODO

**Last Updated**: 2025-11-10 (Evening)
**Current Version**: 0.0.8
**Project Location**: `/Users/niyaro/Documents/Code/logseq-copilot-http`
**HTTP Server Location**: `/Users/niyaro/Documents/Code/logseq-http-server`
**GitHub Repo**: https://github.com/kerim/logseq-db-sidekick

## Project Overview

Browser extension that displays relevant Logseq search results while browsing the web. Connects to a local HTTP server to query Logseq DB graphs without requiring Logseq Desktop to run.

**Scope**: Search-only application - shows relevant notes from your Logseq graph alongside web search results (Google, Bing, DuckDuckGo, etc.).

**DB Graphs Only**: This extension exclusively supports Logseq DB (database) graphs. It does NOT support file-based/markdown graphs, as the @logseq/cli only works with DB graphs.

**Key Achievement**: Successfully implemented search with proper EDN-to-JSON conversion and DB graph property support.

---

## Current Sprint: UX & Infrastructure Improvements

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

### Phase 1: Exclude Journal Pages Setting
**Status**: 🔜 Next Priority
**Goal**: Add user setting to filter out journal pages from search results
**Approach**: POC first, then integrate

#### POC Tasks:
- [ ] Create test script to identify journal pages in Logseq data
- [ ] Test filtering logic with sample data
- [ ] Verify journal page detection works with DB graphs

#### Integration Tasks:
- [ ] Add setting to extension options page (`src/pages/options/Options.tsx`)
- [ ] Store setting in extension storage (`src/config.ts`)
- [ ] Modify search filtering in `httpServerService.ts` (line 34-40)
- [ ] Update UI to show "X results (Y journal pages hidden)" when filter active

**Key Files**:
- `src/pages/options/Options.tsx` - Settings UI
- `src/config.ts` - Configuration storage (lines 1-50)
- `src/pages/logseq/httpServerService.ts` - Search result filtering (lines 23-43)
- `src/types/logseqBlock.ts` - Add journal flag to LogseqPageIdenity type

**Technical Notes**:
- Journal pages have property `journal?: boolean` in LogseqPageResponse
- Check `block.page['journal?']` or similar property
- Filter in `searchGraph()` method before rendering blocks

**Version**: Will be 0.0.9

---

### Phase 2: Floating Button UX (Major Change)
**Status**: Not Started
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

### Phase 3: macOS Background Helper App
**Status**: Not Started
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
- **v0.0.8**: **CURRENT** - Project renamed to "Logseq DB Sidekick", GitHub repo set up
- **v0.0.9**: (Planned) Journal page filtering
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

### If Continuing Tomorrow (2025-11-11 or later)

**What Was Just Completed** (2025-11-10 evening session):
- ✅ Complete project rename: "Logseq Copilot" → "Logseq DB Sidekick"
- ✅ All source code, types, functions, CSS classes renamed
- ✅ New README.md with proper attribution to original creator
- ✅ GitHub repository renamed and updated
- ✅ Version bumped to 0.0.8
- ✅ All tests passing

**Next Task to Work On**:
👉 **Phase 1: Exclude Journal Pages Setting** (see Phase 1 section above)

**Starting Fresh in a New Chat**:
1. ✅ Read this TODO.md first (you're doing it!)
2. Check current version: `cat package.json | grep version` → should be 0.0.8
3. Verify git status: `git log --oneline -5` → last commit should be "Rename project..."
4. Review "Phase 1: Exclude Journal Pages Setting" above for next tasks
5. Create POC first, test, then integrate (follow POC Development Guidelines)

**Quick Status Check**:
```bash
cd /Users/niyaro/Documents/Code/logseq-copilot-http
cat package.json | grep version  # Should show 0.0.8
git log --oneline -3              # Should see rename commit
git remote -v                     # Should show logseq-db-sidekick repo
```

**Important Context**:
- Project is now cleanly renamed and properly attributed
- Extension works with HTTP server at http://localhost:8765
- Only supports DB graphs (not file-based graphs)
- Search-only focus (no editing/capture features)
- All old "copilot" references have been removed
