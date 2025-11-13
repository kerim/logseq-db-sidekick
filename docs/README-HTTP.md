# Logseq Copilot HTTP

This is a fork of [Logseq Copilot](https://github.com/eindex/logseq-copliot) that has been modified to work with [logseq-http-server](https://github.com/kerim/logseq-http-server) instead of the Logseq Plugin API.

## Key Differences from Original

### Architecture Changes

1. **HTTP Server Integration**: Uses the logseq-http-server instead of requiring Logseq Desktop to be running
2. **Independent Operation**: Works even when Logseq Desktop is closed or has a different graph loaded
3. **Read-Only Mode**: Block editing features (TODO/DONE toggles) have been removed as the HTTP server is read-only
4. **DB Graph Support**: Properly handles Logseq DB (database) graphs with their property-based task system

### Configuration Changes

The extension now requires:
- **HTTP Server Host**: Default `localhost` (port 8765)
- **Graph Name**: The name of the Logseq graph to query
- **No Authentication**: The HTTP server doesn't require authentication tokens

### Removed Features

- Block marker toggling (TODO ↔ DONE)
- Block content editing
- All features that require write access to Logseq

### DB Graph Enhancements

This fork properly supports Logseq DB (database) graphs, which use a different task model:

**File-based Graphs** (old):
- Tasks use markers in content: `TODO`, `DOING`, `DONE`
- Markers are part of the block text

**DB Graphs** (new):
- Tasks are blocks tagged with `#Task`
- Status is a property with values: `Todo`, `Doing`, `Done`, `Canceled`, `In Review`, `Backlog`
- Properties are structured data, not text markers

The extension automatically detects and displays:
- Task status as colored badges (blue for Todo, orange for Doing, green for Done, etc.)
- Tags as badges (e.g., `#Task`, `#Project`)
- Priority and other properties from DB graphs
- Works with both DB and file-based graphs

## Setup

### Prerequisites

1. Install the logseq-http-server:
   ```bash
   cd /path/to/logseq-http-server
   python3 logseq_server.py
   ```

2. The server will run on `http://localhost:8765` by default

3. **Important**: Keep the server running while using the extension. The extension will check if the server is running using the `/health` endpoint and provide helpful error messages if it's not accessible.

### Extension Configuration

1. Open the extension options page
2. Configure:
   - **HTTP Server Host**: `localhost`
   - **Port**: `8765` (or your custom port)
   - **Graph Name**: The name of your Logseq graph (e.g., `my-research-notes`)
3. Click "Connect" to verify the connection

## Usage

Once configured, the extension works just like the original Logseq Copilot:

1. **Search Results Integration**: When you search on Google, Bing, DuckDuckGo, etc., relevant notes from your Logseq graph will appear in the sidebar
2. **URL-based Search**: The extension automatically searches for notes related to the current page URL
3. **Quick Capture**: Clip web content to your Logseq graph (if the HTTP server supports write operations in the future)

### Read-Only Limitations

- You can view tasks (TODO, DONE, etc.) but cannot toggle them
- Block content is displayed but cannot be edited directly
- All modifications must be made in Logseq Desktop

## Building the Extension

```bash
# Install dependencies
pnpm install

# Build for all browsers
pnpm run build

# Start development mode (auto-rebuild on changes)
pnpm run start
```

The built extension will be in the `build/` directory:
- `build/chrome/` - Chrome/Edge
- `build/firefox/` - Firefox

## Installation

### Chrome/Edge

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build/chrome/` directory

### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `build/firefox/` directory

## Technical Details

### HTTP Server Client

The extension uses a custom HTTP client (`httpServerClient.ts`) that:
- Communicates with the HTTP server's REST API
- Transforms HTTP server responses to match the original Logseq API format
- Uses Datalog queries for block retrieval
- Properly extracts DB graph properties (status, tags, priority)

### API Endpoints Used

- `GET /health` - Health check to verify server is running
- `GET /search?q=query&graph=name` - Search for content
- `POST /query` - Execute Datalog queries for block retrieval
- `GET /show?graph=name` - Get graph information
- `GET /list` - List available graphs

### Server Health Checking

The extension automatically verifies the HTTP server is running:

1. **Connection Check**: When you click "Connect" in the options page, it calls `/health` to verify the server
2. **Error Messages**: If the server is not running, you'll see: "HTTP Server not running. Start it with: python3 logseq_server.py"
3. **Search Errors**: If the server goes down during use, searches will fail gracefully with helpful error messages
4. **Auto-Detection**: The extension detects network errors and provides specific guidance

**Troubleshooting:**
- If you see "Failed to fetch" errors, check that the HTTP server is running
- Verify the host/port configuration matches your server (default: localhost:8765)
- Check the server terminal for any error messages
- Test the health endpoint directly: `curl http://localhost:8765/health`

### DB Graph Data Transformation

The extension handles DB graph data by:

1. **Extracting Properties**: Pulls `:block/properties`, `:logseq.property/status`, `:logseq.property/priority` from query results
2. **Extracting Tags**: Reads `:block/tags` and maps to tag titles
3. **Status Mapping**: Converts DB status values (`Todo`, `Doing`, `Done`) to display badges
4. **Backward Compatibility**: Maps DB status to traditional markers for consistent display

**Example Datalog Query** (used for block retrieval):
```clojure
{:query [:find (pull ?b [:block/uuid
                          :block/content
                          :block/properties
                          :block/tags
                          :logseq.property/status
                          :logseq.property/priority
                          {:block/tags [:block/title]}
                          {:logseq.property/status [:block/title]}])
        :where [?b :block/uuid #uuid "..."]]}
```

This ensures all DB graph properties are retrieved and properly displayed in the extension UI.

## Contributing

This is a specialized fork for use with logseq-http-server. For the original Logseq Copilot, see the [upstream repository](https://github.com/eindex/logseq-copliot).

## License

MIT (same as original Logseq Copilot)

## Credits

- Original Logseq Copilot by [eindex](https://github.com/eindex)
- HTTP Server integration by [kerim](https://github.com/kerim)
