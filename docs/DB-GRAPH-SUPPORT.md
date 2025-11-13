# Logseq DB Graph Support

This document explains how the Logseq Copilot HTTP extension supports Logseq DB (database) graphs.

## Understanding Logseq DB Graphs

Logseq DB graphs use a fundamentally different data model than file-based Logseq:

### Task System Comparison

| Aspect | File-based Graphs | DB Graphs |
|--------|------------------|-----------|
| Task markers | `TODO`, `DOING`, `DONE` in content | No markers in content |
| Status location | Part of block text | Property: `:logseq.property/status` |
| Status values | `TODO`, `DOING`, `DONE`, `LATER`, `NOW`, `CANCELED` | `Todo`, `Doing`, `Done`, `In Review`, `Backlog`, `Canceled` |
| Task identification | Marker at start of content | Block tagged with `#Task` |
| Priority | `[#A]`, `[#B]`, `[#C]` in content | Property: `:logseq.property/priority` |

### Data Structure

**File-based block:**
```json
{
  "block/uuid": "...",
  "block/content": "TODO Write documentation",
  "block/marker": "TODO"
}
```

**DB graph block:**
```json
{
  "block/uuid": "...",
  "block/content": "Write documentation",
  "block/tags": [
    {"block/title": "Task"}
  ],
  "logseq.property/status": {
    "block/title": "Todo"
  },
  "block/properties": {
    "status": {...},
    "priority": {...}
  }
}
```

## Implementation Details

### 1. Type Extensions

Added new fields to `LogseqBlockType` to support DB graph data:

```typescript
export type LogseqBlockType = {
  // ... existing fields
  properties?: Record<string, any>;  // DB graph properties
  tags?: string[];                   // DB graph tags
  status?: string;                   // Task status from properties
};
```

### 2. Data Transformation

The `transformBlockData()` function extracts DB graph properties:

```typescript
private transformBlockData(blockData: any): LogseqBlockType {
  // Extract status from logseq.property/status
  let status: string | undefined = undefined;
  if (blockData['logseq.property/status']) {
    status = blockData['logseq.property/status']['block/title'];
  }

  // Extract tags
  let tags: string[] = [];
  if (blockData['block/tags']) {
    tags = blockData['block/tags'].map((tag: any) =>
      tag['block/title'] || tag
    );
  }

  // Map status to traditional marker for backward compatibility
  const marker = blockData['block/marker'] ||
                 (status ? this.mapStatusToMarker(status) : undefined);

  return {
    uuid: blockData['block/uuid'],
    content: blockData['block/content'],
    marker: marker,
    status: status,
    tags: tags,
    properties: blockData['block/properties'] || {},
    // ... other fields
  };
}
```

### 3. Status Mapping

Maps DB graph status values to traditional markers:

```typescript
private mapStatusToMarker(status: string): string {
  const statusMap: Record<string, string> = {
    'Todo': 'TODO',
    'Doing': 'DOING',
    'Done': 'DONE',
    'Canceled': 'CANCELED',
    'In Review': 'REVIEW',
    'Backlog': 'LATER',
  };
  return statusMap[status] || status.toUpperCase();
}
```

This allows the UI to display status consistently regardless of graph type.

### 4. Datalog Query Enhancement

Block retrieval queries now pull all necessary DB graph attributes:

```clojure
{:query [:find (pull ?b [:block/uuid
                          :block/content
                          :block/format
                          :block/marker
                          :block/priority
                          :block/properties
                          :block/tags
                          :logseq.property/status
                          :logseq.property/priority
                          {:block/page [:db/id :block/uuid :block/name :block/title]}
                          {:block/tags [:block/title]}
                          {:logseq.property/status [:block/title]}
                          {:logseq.property/priority [:block/title]}])
        :where [?b :block/uuid #uuid "..."]]}
```

Key points:
- Pull both `:block/marker` (file-based) and `:logseq.property/status` (DB)
- Use nested pulls for references (`:block/tags`, `:logseq.property/status`)
- Extract `:block/title` from referenced entities

### 5. UI Rendering

The `LogseqBlock` component now displays status and tags as badges:

```typescript
// Read-only status badge
const statusBadgeRender = (block: LogseqBlockType) => {
  const displayStatus = block.status || block.marker;

  // Color coding
  let badgeColor = 'gray';
  if (displayStatus === 'Todo' || displayStatus === 'TODO') {
    badgeColor = 'blue';
  } else if (displayStatus === 'Doing' || displayStatus === 'DOING') {
    badgeColor = 'orange';
  } else if (displayStatus === 'Done' || displayStatus === 'DONE') {
    badgeColor = 'green';
  }

  return (
    <span style={{
      backgroundColor: badgeColor,
      color: 'white',
      padding: '2px 6px',
      borderRadius: '3px'
    }}>
      {displayStatus}
    </span>
  );
};

// Tags as badges
const tagsBadgeRender = (block: LogseqBlockType) => {
  if (!block.tags || block.tags.length === 0) return null;

  return (
    <div>
      {block.tags.map(tag => (
        <span style={{
          backgroundColor: '#e0e0e0',
          padding: '2px 6px',
          borderRadius: '3px'
        }}>
          #{tag}
        </span>
      ))}
    </div>
  );
};
```

## Backward Compatibility

The extension maintains compatibility with both graph types:

1. **Detection**: Checks for both `block.marker` (file-based) and `block.status` (DB)
2. **Priority**: Prefers DB graph status when both are present
3. **Fallback**: Uses marker if status is not available
4. **Mapping**: Converts DB status to marker format for consistent display

## Testing Considerations

When testing with DB graphs:

1. **Task Blocks**: Should show status badge (not inline marker)
2. **Tag Display**: Tags like `#Task` should appear as badges
3. **Status Colors**:
   - Blue: Todo/Backlog
   - Orange: Doing
   - Green: Done
   - Red: Canceled
   - Purple: In Review
4. **Properties**: Status and priority should be extracted from properties
5. **Mixed Content**: Extension should handle both DB and file-based blocks in search results

## Known Limitations

1. **Write Operations**: DB graph status cannot be modified (read-only)
2. **Custom Properties**: Only status and priority are extracted; other custom properties are stored but not displayed
3. **Nested Properties**: Complex nested properties may not be fully parsed
4. **Search Results**: HTTP server search may return text format requiring parsing

## Future Enhancements

Potential improvements for DB graph support:

1. Display additional properties (deadline, scheduled, custom fields)
2. Filter by property values in search
3. Show property tooltips on hover
4. Support custom status values beyond the standard set
5. Display property icons for better visual distinction
