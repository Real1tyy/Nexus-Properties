---
sidebar_position: 4
---

# Configuration

Nexus Properties offers extensive configuration options to customize how relationships are managed and visualized. This guide covers all available settings.

## Accessing Settings

Open Settings in Obsidian (`Ctrl/Cmd+,`) and navigate to **Nexus Properties** in the sidebar.

---

## User Interface

### Show Ribbon Icon

**Default**: `true`

Display the relationship graph icon in the left ribbon.

:::warning Restart Required
You must restart Obsidian after changing this setting for it to take effect.
:::

---

## Graph Display

Configure how the relationship graph is displayed and behaves.

### Show Search Bar by Default

**Default**: `true`

Display the search bar in the graph view when it loads. You can still toggle it with the command "Toggle Graph Search" even if this is disabled.

### Show Filter Bar by Default

**Default**: `true`

Display the filter bar (preset selector and expression input) in the graph view when it loads. You can still toggle it with commands even if this is disabled.

### Graph Enlarged Width

**Default**: `75%`
**Range**: 50% - 100%

Percentage of window width when the graph is enlarged using the "Enlarge Graph" command.

- **50%** - Half screen width
- **75%** - Three-quarters width (recommended)
- **100%** - Full screen width

### Zoom Preview Height

**Default**: `280px`
**Range**: 120px - 700px

Maximum height in pixels for the zoom preview panel that appears when you click a node.

- **Small vaults**: 200-280px
- **Large vaults**: 400-700px for more content visibility

### Zoom Preview Frontmatter Height

**Default**: `90px`
**Range**: 50px - 300px

Maximum height in pixels for the frontmatter section within the zoom preview.

- **Minimal frontmatter**: 50-90px
- **Extensive frontmatter**: 150-300px

### Graph Animation Duration

**Default**: `800ms`
**Range**: 0ms - 2000ms

Duration of graph layout animations in milliseconds.

- **0ms** - Instant layout (performance mode)
- **400ms** - Fast animations
- **800ms** - Smooth animations (recommended)
- **1500ms+** - Slow, cinematic animations

### All Related Recursion Depth

**Default**: `10`
**Range**: 1 - 20

Maximum number of constellation levels to traverse when "All Related" mode is enabled. Higher values show more distant relationships but may impact performance.

- **1-3** - Immediate connections only
- **5-10** - Medium-sized constellations (recommended)
- **15-20** - Very large networks (may be slow)

:::tip Performance
If the graph becomes slow with "All Related" enabled, reduce this value.
:::

### Hierarchy Traversal Depth

**Default**: `10`
**Range**: 1 - 50

Maximum number of levels to traverse in hierarchy mode. Controls how deep the parent-child tree will be displayed.

- **1-5** - Shallow hierarchies
- **10-20** - Medium hierarchies (recommended)
- **30-50** - Very deep hierarchies

### Display Properties in Nodes

**Default**: `[]` (empty)

Comma-separated list of property names to display inside graph nodes. Properties are shown in a compact format below the node title.

**Examples**:
- `status, priority` - Show task status and priority
- `type, tags` - Show note type and tags
- `date, author` - Show metadata

**Empty** = No properties displayed in nodes (only in tooltips)

### Show Node Tooltips

**Default**: `true`

Display property tooltips when hovering over nodes in the graph. Tooltips show all frontmatter properties of the node.

Can also be toggled with a hotkey (configurable in Obsidian settings).

### Tooltip Width

**Default**: `255px`
**Range**: 150px - 500px

Maximum width of node tooltips in pixels.

- **150-200px** - Compact tooltips
- **250-300px** - Balanced (recommended)
- **400-500px** - Wide tooltips for extensive properties

---

## Property Display

Configure how properties are displayed in tooltips, previews, and zoom mode.

### Hide Empty Properties

**Default**: `true`

Hide properties with empty, null, or undefined values in tooltips and previews.

**Enabled**: Only properties with values are shown
**Disabled**: All properties are shown, even if empty

### Hide Underscore Properties

**Default**: `true`

Hide properties that start with an underscore (`_`) in tooltips and previews.

Useful for hiding internal/system properties like `_ZettelID`.

### Zoom: Hide Frontmatter by Default

**Default**: `false`

When entering zoom preview, frontmatter section starts hidden by default.

You can still toggle frontmatter visibility using the eye icon.

### Zoom: Hide Content by Default

**Default**: `false`

When entering zoom preview, file content starts hidden by default.

You can still toggle content visibility using the eye icon.

---

## Node Colors

Configure the visual appearance of nodes in the graph.

### Default Node Color

**Default**: `#e9f2ff` (light blue)

Default color for nodes when no color rules match. Can be any valid CSS color:
- Hex: `#3b82f6`
- HSL: `hsl(200, 70%, 50%)`
- Named: `steelblue`

### Color Rules

Define conditional colors based on frontmatter properties. Rules are evaluated in order - the first matching rule determines the node color.

Each rule has:
- **Expression** - JavaScript expression that returns true/false
- **Color** - CSS color to apply when expression matches
- **Enabled** - Toggle to enable/disable the rule
- **Order** - Use ↑/↓ buttons to reorder rules

**Example Rules**:

| Expression | Color | Description |
|------------|-------|-------------|
| `Status === 'Active'` | `#22c55e` (green) | Active nodes |
| `type === 'project'` | `#3b82f6` (blue) | Project nodes |
| `Priority === 'High'` | `#ef4444` (red) | High priority |
| `Array.isArray(tags) && tags.includes('important')` | `#f59e0b` (orange) | Important tags |

[Learn more about Color Rules →](features/color-rules)

---

## Graph Filtering

Configure how nodes can be filtered in the graph view.

### Filter Expressions

Show only nodes (and their edges) whose frontmatter matches ALL expressions. Each line should be a JavaScript expression returning true/false.

Access frontmatter properties directly by name. The source node is always shown.

**Example Expressions**:

```javascript
Status === 'Active'
type === 'project'
Array.isArray(tags) && tags.includes('important')
```

Changes apply on blur or `Ctrl/Cmd+Enter`.

[Learn more about Filtering →](features/filtering)

### Filter Presets

Create named filter presets for quick access in the graph. Use the command "Toggle Graph Filter (Preset Selector)" to show a dropdown with your presets.

Each preset has:
- **Name** - Display name (e.g., "Active Tasks", "Projects")
- **Expression** - Filter expression to apply

Selecting a preset fills the filter expression input.

### Pre-fill Filter Preset

Automatically fill the filter input with a selected preset when the graph opens.

**Key Differences**:
- **Filter Expressions** (default filters) - Always applied and cannot be toggled off by users
- **Pre-fill Filter Preset** - Optional initial filter that users can clear or modify at any time

**Use Cases**:
- Start with a common filter but allow users to change it
- Provide a helpful default without forcing it
- Reduce repetitive filtering actions while maintaining flexibility

---

## Indexing

### Index and Assign Properties to All Files

Manually scan all files in your vault and assign relationship properties based on your configured settings.

This process will:
1. Scan all files in configured directories
2. Update their frontmatter with bidirectional relationships
3. Compute recursive relationships
4. Clean up orphaned relationships

**When to use**:
- After changing property names
- After enabling the plugin for the first time
- When relationships seem out of sync
- After bulk importing notes

:::warning Large Vaults
This operation may take some time for vaults with thousands of files. Progress is logged to the console.
:::

---

## Directory Scanning

Configure which directories to scan for files with relationships.

**Default**: `["*"]` (scan all directories)

### Options

- **`*`** - Scan all directories in the vault
- **Specific paths** - Only scan specified directories and their subdirectories

**Examples**:

| Configuration | What Gets Scanned |
|---------------|-------------------|
| `["*"]` | Entire vault |
| `["Projects"]` | Only `Projects/` and subdirectories |
| `["Projects", "Notes/Work"]` | Both directories and subdirectories |

### Adding Directories

1. Enter a directory path (e.g., `Projects` or `Notes/Work`)
2. Click "Add"
3. The directory and all its subdirectories will be scanned

:::tip Wildcard Behavior
When you add a specific directory, `"*"` is automatically removed. To scan all directories again, use the "Scan all" quick action.
:::

### Quick Actions

- **Reset to scan all directories** - Clears all specific directories and scans the entire vault

---

## Direct Relationship Properties

Configure property names for direct bidirectional relationships.

:::info Bidirectional Sync
When you set a relationship in one direction, the plugin automatically updates the reverse relationship.
:::

### Parent Property

**Default**: `Parent`

Property name for parent reference (bidirectional with children).

**Example**:
```yaml
# child-note.md
Parent: "[[parent-note]]"
```

### Children Property

**Default**: `Child`

Property name for children references (bidirectional with parent).

**Example**:
```yaml
# parent-note.md
Child:
  - "[[child-note-1]]"
  - "[[child-note-2]]"
```

### Related Property

**Default**: `Related`

Property name for related files (bidirectional - automatically syncs between linked files).

**Example**:
```yaml
# note-1.md
Related:
  - "[[note-2]]"
  - "[[note-3]]"
```

### Auto-Link Siblings

**Default**: `true`

Automatically mark nodes as related when they share the same parent (siblings are related to each other).

**Enabled**: Siblings automatically get related relationships
**Disabled**: Only explicitly defined related relationships exist

---

## Frontmatter Propagation

Configure how frontmatter changes propagate from parent files to their children in the hierarchy.

:::info Automatic Propagation
When you modify frontmatter properties in a parent file, these changes can automatically propagate to all child files (and recursively to their children). This keeps your hierarchy synchronized.
:::

### Propagate Frontmatter to Children

**Default**: `false`

Automatically propagate frontmatter changes from parent files to all their children (recursively).

**Enabled**: Changes propagate automatically without confirmation
**Disabled**: No automatic propagation (use "Ask Before Propagating" for manual control)

**How it works**:
- When you modify frontmatter in a parent file, changes are detected
- After a debounce delay, changes automatically apply to all children
- Changes propagate recursively through the entire child hierarchy
- Only non-excluded properties are propagated (see "Excluded Propagated Properties")

**Example**:
```yaml
# parent-note.md (you change Status from "Draft" to "Published")
Status: Published
Priority: High
```

All child files automatically get updated:
```yaml
# child-note.md (automatically updated)
Status: Published  # ← Propagated from parent
Priority: High     # ← Propagated from parent
```

### Ask Before Propagating Frontmatter

**Default**: `false`

Show a confirmation modal before propagating frontmatter changes to children.

**Enabled**: Modal appears asking if you want to propagate changes
**Disabled**: No modal (use "Propagate Frontmatter to Children" for automatic propagation)

**When enabled**:
- A modal appears when frontmatter changes are detected in a parent file
- Shows which properties changed and how many children will be affected
- You can confirm or cancel the propagation
- If confirmed, changes propagate recursively to all children

**Use cases**:
- Review changes before applying them
- Selective propagation based on context
- Prevent accidental propagation of sensitive changes

:::tip Both Settings Disabled
If both "Propagate Frontmatter to Children" and "Ask Before Propagating Frontmatter" are disabled, no propagation occurs. You can still manually update child files.
:::

### Excluded Propagated Properties

**Default**: `""` (empty)

Comma-separated list of property names that should NOT be propagated to children, even when propagation is enabled.

**Examples**:
- `Status, Priority` - Don't propagate status or priority changes
- `_ZettelID, CreatedDate` - Don't propagate system properties
- `Author, LastModified` - Don't propagate metadata fields

**How it works**:
- Properties listed here are excluded from propagation
- Relationship properties (`Parent`, `Child`, `Related`) are always excluded automatically
- Excluded properties remain unchanged in child files
- Useful for properties that should differ between parent and children

**Example**:
```
Excluded Propagated Properties: Status, Priority
```

If you change `Status` and `Priority` in a parent file, these changes won't propagate to children, but other properties will still propagate.

### Propagation Debounce Delay

**Default**: `1000ms`
**Range**: 100ms - 10000ms

Delay in milliseconds before propagating changes. This prevents excessive propagation when making multiple rapid edits.

**How it works**:
- When you make changes, propagation waits for this delay
- If you make more changes within the delay, the timer resets
- After the delay expires with no new changes, propagation occurs
- All changes made during the delay are merged and propagated together

**Recommended values**:
- **100-500ms** - Fast propagation for quick edits
- **1000ms** - Balanced (recommended for most users)
- **2000-5000ms** - Slower propagation, better for careful editing
- **10000ms** - Very slow, only propagate when you're completely done editing

**Example**:
If debounce is set to 1000ms and you:
1. Change `Status` at 0ms
2. Change `Priority` at 500ms
3. Change `Tags` at 800ms

All three changes are merged and propagated together after 1800ms (1000ms after the last change).

---

## Node Creation Shortcuts

Configure how new nodes are created using command palette shortcuts.

### Zettel ID Property

**Default**: `_ZettelID`

Property name for unique timestamp identifier assigned to new nodes.

Format: `YYYYMMDDHHmmss` (e.g., `20250125143022`)

### How It Works

When you use commands like "Create Child Node":

1. New node is created in the same folder as the source file
2. All frontmatter properties are inherited (except excluded properties)
3. A new Zettel ID is generated automatically
4. Bidirectional relationships are established automatically
5. Commands are only available for files in indexed directories

[Learn more about Node Creation →](features/node-creation)

---

## Excluded Properties

Configure which frontmatter properties should NOT be copied when creating new nodes.

### Default Excluded Properties

**Default**: `["Parent", "Child", "Related", "_ZettelID"]`

Comma-separated list of properties to ALWAYS exclude from copying. These are excluded regardless of any path-based rules.

**Common exclusions**:
- Relationship properties: `Parent`, `Child`, `Related`
- System properties: `_ZettelID`, `_CreatedDate`
- File-specific: `date`, `created`, `modified`

### Path-Based Exclusion Rules

Define rules to exclude ADDITIONAL properties for files in specific directories. The default excluded properties are always excluded. Rules are evaluated in order - the first matching path's properties are ADDED to the default exclusion list.

Each rule has:
- **Path** - Directory path (uses `startsWith` matching)
- **Excluded Properties** - Comma-separated properties to exclude
- **Enabled** - Toggle to enable/disable the rule
- **Order** - Use ↑/↓ buttons to reorder rules

**Example Rules**:

| Path | Excluded Properties | Description |
|------|---------------------|-------------|
| `Projects/` | `status, progress` | Don't copy status/progress for projects |
| `Daily Notes/2024/` | `date, weekday` | Don't copy date fields from daily notes |
| `Templates/` | `template-version` | Don't copy template metadata |

:::warning Path Matching
Path matching uses `startsWith` - a file matches if its path starts with the rule's path. Default excluded properties are ALWAYS excluded. Path rules ADD additional properties to exclude.
:::

[Learn more about Property Exclusion →](features/excluded-properties)

---

## Hotkeys

You can assign custom hotkeys to any Nexus Properties command in Obsidian's Hotkeys settings.

### Recommended Hotkeys

| Command | Suggested Hotkey | Description |
|---------|------------------|-------------|
| Show Relationship Graph | `Ctrl+Shift+G` | Open/toggle graph view |
| Toggle Graph Search | `Ctrl+K` | Show/hide search bar |
| Toggle Graph Filter | `Ctrl+F` | Show/hide filter input |
| Enlarge Graph | `Ctrl+Shift+E` | Enlarge/restore graph |
| Create Child Node | `Ctrl+Shift+C` | Create child of current file |
| Create Parent Node | `Ctrl+Shift+P` | Create parent of current file |
| Create Related Node | `Ctrl+Shift+R` | Create related to current file |

To set hotkeys:
1. Open Settings → Hotkeys
2. Search for "Nexus Properties"
3. Click the `+` icon next to a command
4. Press your desired key combination

---

## Performance Tips

For large vaults with thousands of files:

1. **Limit directory scanning** - Only scan folders you need
2. **Reduce recursion depth** - Lower "All Related" and "Hierarchy" depth limits
3. **Disable animations** - Set animation duration to 0ms
4. **Use filter expressions** - Show only relevant nodes
5. **Hide tooltips** - Disable tooltips if you don't need them
6. **Limit displayed properties** - Keep "Display properties in nodes" empty or minimal

---

## Resetting Settings

To reset all settings to defaults:

1. Open Settings → Nexus Properties
2. Close Obsidian completely
3. Navigate to `<vault>/.obsidian/plugins/nexus-properties/`
4. Delete or rename `data.json`
5. Restart Obsidian

The plugin will regenerate default settings on next load.

---

## Next Steps

- [Explore all features](features/overview)
- [Learn about Graph Views](features/graph-views)
- [Master Color Rules](features/color-rules)
- [Understand Filtering](features/filtering)
