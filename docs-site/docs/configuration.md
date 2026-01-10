---
sidebar_position: 4
---

# Configuration

Access: Settings (`Ctrl/Cmd+,`) → **Nexus Properties**

## User Interface

**Show Ribbon Icon** (default: `true`): Display graph icon in left ribbon
- ⚠️ Restart required after changing

**Show View Switcher Header** (default: `true`): Display header with toggle button in Nexus Properties view
- Changes apply immediately

### View Switcher Statistics

**Show Simple Statistics** (default: `true`): Display direct parent, children, and related counts
- Shows immediate relationships only (one level)
- Format: `Parents: N`, `Children: N`, `Related: N`

**Show Recursive Statistics** (default: `true`): Display recursive (all) parent, children, and related counts
- Shows all relationships across entire hierarchy
- Format: `All Parents: N`, `All Children: N`, `All Related: N`
- Uses efficient traversal with cycle detection

**Layout**: Statistics appear on the left side of the view switcher header without affecting the centered toggle button position.

## Graph Display

**Show Search Bar by Default** (default: `true`): Display search bar on graph open

**Show Filter Bar by Default** (default: `true`): Display filter bar on graph open

**Show Zoom Indicator** (default: `true`): Display zoom level indicator in filter row
- Shows current zoom percentage (e.g., "100%")
- Click to type a specific zoom level

**Maintain Indirect Connections When Filtering** (default: `true`): Preserve connections when intermediate nodes are filtered
- Example: A → B → C, filter out B → shows A → C
- Prevents graph fragmentation during filtering
- [Learn more →](features/filtering#indirect-connections)

**Graph Enlarged Width** (default: `75%`, range: 50-100%): Window width when enlarged

**Zoom Preview Height** (default: `280px`, range: 120-700px): Max height for zoom preview panel

**Zoom Preview Frontmatter Height** (default: `90px`, range: 50-300px): Max height for frontmatter section

**Graph Animation Duration** (default: `800ms`, range: 0-2000ms): Layout animation duration (0ms = instant)

**All Related Recursion Depth** (default: `10`, range: 1-20): Max levels in "All Related" mode

**Hierarchy Traversal Depth** (default: `10`, range: 1-50): Max levels in hierarchy mode

## Multi-Row Layout

Configure how nodes with many children are displayed in hierarchy mode.

**Use Multi-Row Layout for Large Families** (default: `false`): Enable multi-row child positioning
- Distributes children across multiple staggered rows when a parent has many children
- Uses more vertical space and less horizontal space for better readability
- Applies only in hierarchy mode (not constellation or related views)

**Max Children Per Row** (default: `10`, range: 3-30): Maximum children in a single row
- When exceeded, children wrap to next row in staggered pattern
- Pattern: full row (10), offset row (9), full row (10), offset row (9)...
- Offset rows fit between nodes in the row above, creating a domino effect
- Only applies when multi-row layout is enabled

**How it works**:
1. Parent with 15 children and max=10:
   - Row 1: 10 children in a line
   - Row 2: 5 children offset between Row 1 gaps
2. Grandchildren are positioned below the lowest row of their parent's generation
3. Proper spacing maintained between all generations

**Use cases**:
- Organizational charts with many direct reports
- Project hierarchies with numerous sub-tasks
- Knowledge structures with broad categorization

**Display Properties in Nodes** (default: `[]`): Comma-separated properties to show in nodes (e.g., `status, priority`)

**Show Node Tooltips** (default: `true`): Display property tooltips on hover

**Tooltip Width** (default: `255px`, range: 150-500px): Max tooltip width

## Property Display

**Hide Empty Properties** (default: `true`): Hide null/undefined values in tooltips and previews

**Hide Underscore Properties** (default: `true`): Hide properties starting with `_`

**Zoom: Hide Frontmatter by Default** (default: `false`): Start zoom with frontmatter hidden

**Zoom: Hide Content by Default** (default: `false`): Start zoom with content hidden

## Node Colors

**Default Node Color** (default: `#e9f2ff`): Color when no rules match (hex, HSL, or named CSS)

**Color Rules**: Conditional colors based on frontmatter
- **Expression**: JavaScript returning true/false
- **Color**: CSS color to apply
- **Enabled**: Toggle on/off
- **Order**: ↑/↓ to reorder (first match wins)

**Examples**:
```javascript
Status === 'Active'  → #22c55e (green)
type === 'project'  → #3b82f6 (blue)
Array.isArray(tags) && tags.includes('important')  → #f59e0b (orange)
```

[Learn more →](features/color-rules)

## Graph Filtering

**Filter Expressions**: Show only nodes matching ALL expressions (one per line)
- Access frontmatter properties directly
- Source node always shown
- Apply on blur or `Ctrl/Cmd+Enter`

**Examples**:
```javascript
Status === 'Active'
type === 'project'
Array.isArray(tags) && tags.includes('important')
```

**Filter Presets**: Named filters for quick access
- Use command "Toggle Graph Filter (Preset Selector)"
- Each preset has name and expression

**Pre-fill Filter Preset**: Auto-fill filter on graph open
- **Filter Expressions**: Always applied, can't be cleared
- **Pre-fill Preset**: Initial suggestion, can be modified/cleared

[Learn more →](features/filtering)

## Indexing

**Index and Assign Properties to All Files**: Manually scan vault and update relationships

**When to use**:
- After changing property names
- First-time plugin setup
- Relationships out of sync
- After bulk imports

⚠️ May take time for large vaults

## Directory Scanning

**Default**: `["*"]` (scan all)

**Options**:
- `*` - Scan entire vault
- Specific paths - Only scan those directories and subdirectories

**Examples**:
- `["*"]` - Entire vault
- `["Projects"]` - Only Projects/ and subdirectories
- `["Projects", "Notes/Work"]` - Both directories

**Quick Actions**: Reset to scan all directories

## Direct Relationship Properties

**Parent Property** (default: `Parent`): Property name for parent references
```yaml
Parent: "[[parent-note]]"
```

**Children Property** (default: `Child`): Property name for children references
```yaml
Child: ["[[child-1]]", "[[child-2]]"]
```

**Related Property** (default: `Related`): Property name for related files
```yaml
Related: ["[[note-2]]", "[[note-3]]"]
```

**Auto-Link Siblings** (default: `true`): Automatically mark siblings as related

## Frontmatter Propagation

**Propagate Frontmatter to Children** (default: `false`): Auto-propagate changes to children recursively

**Ask Before Propagating Frontmatter** (default: `false`): Show confirmation modal before propagating

**Excluded Propagated Properties** (default: `""`): Comma-separated properties to exclude (e.g., `Status, Priority`)
- Relationship properties always excluded

**Propagation Debounce Delay** (default: `1000ms`, range: 100-10000ms): Delay before propagating

## Bases View

**Enable Archived Filtering** (default: `false`): Split files into "Archived" and "Active" sections

**Archived Property Name** (default: `Archived`): Property marking files as archived

**Default Included Properties** (default: `[]`): Comma-separated properties as columns (e.g., `status, priority, tags`)
- `file.name` always shown first

**Custom Formulas** (default: `""`): YAML defining sort formulas (content AFTER `formulas:`)

**Example**:
```yaml
  _priority_sort: |-
    [
      ["Very High", 1],
      ["High", 2],
      ["Medium", 3],
      ["Low", 4],
      ["null", 5]
    ].filter(value[0] == Priority.toString())[0][1]
```

**Custom Sort Configuration** (default: `""`): YAML defining sort rules (content AFTER `sort:`)

**Example**:
```yaml
      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC
```

**Path-Based Inclusion Rules**: Add extra columns for specific directories
- **Path**: Directory path (startsWith matching)
- **Included Properties**: Comma-separated additional columns
- **Enabled**: Toggle on/off
- **Order**: ↑/↓ to reorder (first match wins)

**Column order**: `file.name` → default properties → path-specific properties

[Learn more →](features/bases-view)

## Node Creation Shortcuts

**Zettel ID Property** (default: `_ZettelID`): Property for unique timestamp ID (format: `YYYYMMDDHHmmss`)

**How it works**:
1. New node in same folder as source
2. Inherits frontmatter (except excluded)
3. New Zettel ID generated
4. Bidirectional relationships established
5. Only for files in indexed directories

[Learn more →](features/node-creation)

## Excluded Properties

**Default Excluded Properties** (default: `["Parent", "Child", "Related", "_ZettelID"]`): Always excluded when creating nodes

**Path-Based Exclusion Rules**: Exclude additional properties for specific directories
- **Path**: Directory path (startsWith matching)
- **Excluded Properties**: Comma-separated additional exclusions
- **Enabled**: Toggle on/off
- **Order**: ↑/↓ to reorder (first match wins)

**Examples**:
- `Projects/` → `status, progress`
- `Daily Notes/` → `date, weekday`
- `Templates/` → `template-version`

[Learn more →](features/excluded-properties)

## Hotkeys

All commands support custom hotkey assignment.

[View all available commands and recommended hotkeys →](hotkeys)

## Performance Tips

For large vaults:
1. Limit directory scanning
2. Reduce recursion depth
3. Disable animations (0ms)
4. Use filter expressions
5. Hide tooltips
6. Minimize displayed properties

## Resetting Settings

1. Close Obsidian
2. Navigate to `<vault>/.obsidian/plugins/nexus-properties/`
3. Delete or rename `data.json`
4. Restart Obsidian

## Next Steps

- [Features Overview](features/overview)
- [Graph Views](features/graph-views)
- [Color Rules](features/color-rules)
- [Filtering](features/filtering)
