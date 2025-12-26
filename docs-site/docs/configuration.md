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

Display the search bar when the graph view opens. Can always be toggled with the "Toggle Graph Search" command.

### Show Filter Bar by Default

**Default**: `true`

Display the filter bar when the graph view opens. Can always be toggled with filter commands.

### Graph Enlarged Width

**Default**: `75%` | **Range**: 50% - 100%

Window width percentage when graph is enlarged with the "Enlarge Graph" command.

### Zoom Preview Height

**Default**: `280px` | **Range**: 120px - 700px

Maximum height for the zoom preview panel when clicking a node. Increase for more content visibility.

### Zoom Preview Frontmatter Height

**Default**: `90px` | **Range**: 50px - 300px

Maximum height for the frontmatter section within zoom preview. Increase if you have many properties.

### Graph Animation Duration

**Default**: `800ms` | **Range**: 0ms - 2000ms

Duration of graph layout animations. Set to 0ms for instant updates (better performance).

### All Related Recursion Depth

**Default**: `10` | **Range**: 1 - 20

Maximum levels to traverse when "All Related" mode is enabled. Higher values show more distant relationships but may impact performance.

:::tip Performance
If the graph becomes slow, reduce this value.
:::

### Hierarchy Traversal Depth

**Default**: `10` | **Range**: 1 - 50

Maximum levels to traverse in hierarchy mode. Controls depth of the parent-child tree.

### Display Properties in Nodes

**Default**: `[]` (empty)

Comma-separated list of property names to display inside graph nodes below the title.

**Examples**: `status, priority` or `type, tags` or `date, author`

### Show Node Tooltips

**Default**: `true`

Display property tooltips when hovering over nodes. Shows all frontmatter properties. Can be toggled with a hotkey.

### Tooltip Width

**Default**: `255px` | **Range**: 150px - 500px

Maximum width of node tooltips. Increase for properties with longer values.

---

## Property Display

Configure how properties are displayed in tooltips, previews, and zoom mode.

### Hide Empty Properties

**Default**: `true`

Hide properties with empty, null, or undefined values in tooltips and previews.

### Hide Underscore Properties

**Default**: `true`

Hide properties starting with underscore (`_`) in tooltips and previews. Useful for internal/system properties like `_ZettelID`.

### Zoom: Hide Frontmatter by Default

**Default**: `false`

Start zoom preview with frontmatter section hidden. Can still toggle with the eye icon.

### Zoom: Hide Content by Default

**Default**: `false`

Start zoom preview with file content hidden. Can still toggle with the eye icon.

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

Configure property names for direct bidirectional relationships. When you set a relationship in one direction, the reverse is automatically updated.

### Parent Property

**Default**: `Parent`

Property name for parent references (syncs with children).

```yaml
Parent: "[[parent-note]]"
```

### Children Property

**Default**: `Child`

Property name for children references (syncs with parent).

```yaml
Child:
  - "[[child-1]]"
  - "[[child-2]]"
```

### Related Property

**Default**: `Related`

Property name for related files (bidirectional sync between linked files).

```yaml
Related:
  - "[[note-2]]"
  - "[[note-3]]"
```

### Auto-Link Siblings

**Default**: `true`

Automatically mark nodes as related when they share the same parent.

---

## Frontmatter Propagation

Configure how frontmatter changes propagate from parent files to their children. When you modify properties in a parent, changes can automatically sync to all children recursively.

### Propagate Frontmatter to Children

**Default**: `false`

Automatically propagate frontmatter changes from parent files to all children (recursively) without confirmation.

### Ask Before Propagating Frontmatter

**Default**: `false`

Show a confirmation modal before propagating changes. Modal displays which properties changed and how many children will be affected.

:::tip Both Settings Disabled
If both are disabled, no propagation occurs. You must manually update child files.
:::

### Excluded Propagated Properties

**Default**: `""` (empty)

Comma-separated list of properties to exclude from propagation. Relationship properties (`Parent`, `Child`, `Related`) are always excluded automatically.

**Examples**: `Status, Priority` or `_ZettelID, CreatedDate`

### Propagation Debounce Delay

**Default**: `1000ms` | **Range**: 100ms - 10000ms

Delay before propagating changes. Prevents excessive propagation during rapid edits. Timer resets with each new change.

---

## Bases View

Configure how files are displayed in table format with the Bases view feature.

### Enable Archived Filtering

**Default**: `false`

When enabled, the Bases view shows separate sections for archived and non-archived files. When disabled, all files are shown together without filtering.

**Enabled**: Files are split into "Archived" and "Active" sections based on the archived property
**Disabled**: All files shown in a single unified view

### Archived Property Name

**Default**: `Archived`

Name of the frontmatter property used to mark files as archived. Only used when "Enable Archived Filtering" is enabled.

**Examples**:
- `Archived` - Standard property name
- `_Archived` - Hidden property (starts with underscore)
- `Status` - Use existing status property

### Default Included Properties

**Default**: `[]` (empty)

Comma-separated list of frontmatter properties to display as columns in Bases view tables. The file name (`file.name`) is always shown as the first column.

**Examples**:
- `status, priority, tags` - Project management properties
- `date, author, type` - Content metadata
- `deadline, assignee` - Task tracking

**Empty** = Only file name column is shown

### Custom Formulas

**Default**: `""` (empty)

Define custom formulas for advanced sorting. Enter YAML content that defines how to map property values to numeric sort priorities.

**Format**: Enter only the content that goes AFTER `formulas:` (don't include `formulas:` itself)

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

This example creates a formula named `_priority_sort` that maps priority values to numbers for sorting.

### Custom Sort Configuration

**Default**: `""` (empty)

Define how table rows should be sorted. Enter YAML content that specifies sort rules.

**Format**: Enter only the content that goes AFTER `sort:` (don't include `sort:` itself)

**Example**:
```yaml
      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC
```

This example sorts by priority (ascending) first, then by modification time (descending).

### Path-Based Inclusion Rules

Define rules to include ADDITIONAL properties as columns for files in specific directories. Default properties are always included - path rules ADD extra columns on top.

Rules are evaluated in order - the first matching path's additional properties are added to the default list.

Each rule has:
- **Path** - Directory path (uses `startsWith` matching)
- **Included Properties** - Comma-separated properties to add as columns
- **Enabled** - Toggle to enable/disable the rule
- **Order** - Use ↑/↓ buttons to reorder rules

**Example Rules**:

| Path | Included Properties | Description |
|------|---------------------|-------------|
| `Projects/` | `deadline, assignee` | Add deadline and assignee columns for project files |
| `Daily Notes/` | `mood, weather` | Add mood and weather columns for daily notes |

**Column Order**:
1. `file.name` (always first)
2. Default included properties (in order specified)
3. Path-specific properties (in order specified)

:::warning Path Matching
Path matching uses `startsWith` - a file matches if its path starts with the rule's path. Default properties are ALWAYS included. Path rules ADD additional columns.
:::

[Learn more about Bases View →](features/bases-view)

---

## Node Creation Shortcuts

Configure how new nodes are created using command palette shortcuts.

### Zettel ID Property

**Default**: `_ZettelID`

Property name for unique timestamp identifier assigned to new nodes (format: `YYYYMMDDHHmmss`).

### How It Works

When using commands like "Create Child Node":

1. New node created in same folder as source file
2. All frontmatter inherited (except excluded properties)
3. New Zettel ID generated automatically
4. Bidirectional relationships established automatically
5. Only available for files in indexed directories

[Learn more about Node Creation →](features/node-creation)

---

## Excluded Properties

Configure which frontmatter properties should NOT be copied when creating new nodes.

### Default Excluded Properties

**Default**: `["Parent", "Child", "Related", "_ZettelID"]`

Properties to ALWAYS exclude from copying, regardless of path rules. Common exclusions include relationship properties, system properties, and file-specific metadata.

### Path-Based Exclusion Rules

Define rules to exclude ADDITIONAL properties for files in specific directories. Default excluded properties are always excluded - path rules ADD more exclusions.

Rules are evaluated in order - the first matching path adds its properties to the exclusion list.

Each rule has:
- **Path** - Directory path (uses `startsWith` matching)
- **Excluded Properties** - Comma-separated properties to exclude
- **Enabled** - Toggle to enable/disable the rule
- **Order** - Use ↑/↓ buttons to reorder

**Example Rules**:

| Path | Excluded Properties | Description |
|------|---------------------|-------------|
| `Projects/` | `status, progress` | Don't copy status/progress for projects |
| `Daily Notes/` | `date, weekday` | Don't copy date fields |
| `Templates/` | `template-version` | Don't copy template metadata |

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
