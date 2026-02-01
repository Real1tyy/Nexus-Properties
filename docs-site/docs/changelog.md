---
sidebar_position: 101
---

# Changelog

All notable changes to Nexus Properties will be documented here.

## 1.7.0 - TBD

### New Features

#### Undo/Redo for Graph Operations

Full undo/redo support for all graph operations, allowing you to easily revert accidental changes.

- **Supported Operations**:
  - Adding relationships (parent, child, related)
  - Removing relationships (edge removal)
  - Creating nodes (parent, child, related)
  - Deleting nodes
  - Editing node frontmatter
- **Configurable Hotkeys**: Assign your preferred keyboard shortcuts in Settings → Hotkeys
- **History Management**: Maintains up to 50 operations in history
- **Smart State Tracking**: Each command captures the necessary state to fully restore previous conditions
- **Instant Delete**: Node deletion no longer shows a confirmation dialog since it can be easily undone

**How it works**: When you perform an operation like adding a relationship or deleting a node, the plugin captures the state before and after the change. Pressing undo reverses the operation, and redo re-applies it. The undo/redo stacks work like most applications - performing a new action clears the redo history.

See [Hotkeys](hotkeys#undoredo) for keyboard shortcuts.

#### Configurable View Sidebar Position

Choose which sidebar to open the Nexus Properties view in, giving you control over your workspace layout.

- **Left or Right Sidebar**: Select your preferred sidebar position in settings
- **Default**: Opens in left sidebar (preserves existing behavior)

See [Configuration](configuration#user-interface) for details.

#### Automatic Title Property

The plugin can automatically assign a `Title` property to files, making graph rendering faster and more consistent.

- **First-Time Setup**: On first use, a setup modal prompts you to enable or disable automatic title properties
- **Auto-Computed Title**: When a file has a parent, the title is computed by stripping the parent name prefix from the filename (e.g., "Parent - Child.md" gets display name "Child")
- **Wiki Link Format**: Title is stored as `[[path|DisplayName]]` making it clickable in Bases view
- **No Parent Fallback**: Files without a parent get their basename as the display name
- **Configurable Property Name**: Change the property name in settings (default: `Title`)
- **Automatic Updates**: Title is updated whenever parent relationships change

**Title Property Mode** (Settings → Properties):
- **Enabled**: Automatically adds title properties to all indexed files. Bases view uses the title property for display.
- **Disabled**: No title properties are added. Bases view uses raw file names (`file.name`). Graph view still strips parent prefixes for display.
- **Not Configured**: Shows setup modal on startup to help you decide.

**Important**: Graph view always strips parent prefixes from node labels regardless of this setting. The title property mode only affects:
1. Whether title properties are written to file frontmatter
2. Whether Bases view uses the title property or raw file names

See [Configuration](configuration#automatic-title-property) for details.

#### Exclude Directories from Title Assignment

Control which directories are excluded from automatic title property assignment.

- **Comma-Separated Paths**: Specify multiple directory paths separated by commas (e.g., `Templates, Daily Notes`)
- **Path Matching**: Files in the specified directories (and their subdirectories) will not receive automatic title properties
- **Use Cases**: Exclude templates, daily notes, or other directories where automatic titles are not needed
- **Default**: Empty (all indexed directories receive title properties)
- **Configure Before Enabling**: The setup modal recommends configuring exclusions before enabling title properties

See [Configuration](configuration#automatic-title-property) for setup instructions.

### Bug Fixes

#### Console Error When Selecting Parent from Suggester

Fixed an "Uncaught NotFoundError": failed to execute 'removeChild' on 'Node' that appeared in the developer console when selecting a parent note from the property suggester dropdown in Obsidian's Properties panel.

## 1.6.0 - 1/11/2026

### Bug Fixes

#### Bases View Filter Errors When Switching Notes

- **Fixed "Type error in 'contains'" errors**: Bases view no longer throws filter errors when switching between notes with empty relationship properties
- **Root cause**: Excluded properties were set to empty strings (`""`) instead of `null` when creating new nodes
- **Solution**: New nodes now set excluded relationship properties to `null`, which Bases handles gracefully

If you encounter this error on existing notes, see [Troubleshooting → Bases View Filter Errors](troubleshooting#bases-view-filter-errors).

### New Features

#### Hierarchy Depth Slider

Control how deep the graph traverses hierarchical relationships with an interactive depth slider in the graph view header.

- **Dynamic Depth Control**: Adjust recursion depth from 1 to 50 levels using a slider
- **Separate Depths**: Automatically uses appropriate depth setting based on view type:
  - **Hierarchy views** (parent/child): Uses hierarchyMaxDepth setting
  - **All Related views** (constellation): Uses allRelatedMaxDepth setting
- **Temporary Adjustments**: Slider changes don't save to settings, only affect current session
- **Live Updates**: Graph and statistics recalculate immediately as you adjust the slider
- **Configurable**: Toggle slider visibility in settings (default: enabled)

**How it works**: When viewing node E in hierarchy A → B → C → D → E with depth 3:
- Finds an ancestor at the right level → starts at C
- Builds down 3 levels → shows C, D, E and all descendants

**Settings**:
- `Show Depth Slider in Graph View` (default: `true`) - Display the depth slider in graph view header

See [Graph Views](features/graph-views#depth-control) for usage examples.

#### Node Statistics in View Switcher Header

The view switcher header now displays real-time relationship statistics for the active file, giving instant insight into node connections.

- **Direct Relationships**: Shows immediate parent, children, and related counts
- **Recursive Relationships**: Shows all (recursive) parent, children, and related counts across the entire hierarchy
- **Configurable Display**: Two separate toggles to show/hide simple and recursive statistics independently
- **Respects Depth**: Recursive statistics use the current depth slider value when active

**Example Display**:
```
Parents: 1          All Parents: 3
Children: 2         All Children: 8
Related: 3          All Related: 12
```

**Settings**:
- `Show Simple Statistics` (default: `true`) - Display direct relationship counts
- `Show Recursive Statistics` (default: `true`) - Display recursive relationship counts

See [Configuration](configuration#view-switcher-statistics) for details.

#### Prioritize Parent Property

Control which parent is used when building hierarchy graphs for nodes with multiple parents.

- **Configurable Property**: Set "Prioritize Parent Property" in settings to specify which frontmatter property controls parent selection
- **Per-Node Control**: Each node can specify its preferred parent using this property
- **Automatic Selection**: If the prioritized parent exists in the node's parent list, it's used; otherwise falls back to first available parent
- **Graph-Wide Application**: Works for all nodes in the hierarchy, not just the source node

**Example**:
```yaml
Parent: ["[[Team A]]", "[[Team B]]", "[[Team C]]"]
PriorityParent: "[[Team B]]"  # Team B will be used in hierarchy views
```

See [Configuration](configuration#direct-relationship-properties) for setup instructions.

#### What's New Modal

Automatic changelog notifications keep you informed about new features and improvements.

- **Version Updates**: Modal appears automatically when plugin updates to a new version
- **Changelog Display**: Shows formatted changelog with all new features, improvements, and fixes
- **Quick Links**: Direct access to full changelog, documentation, and support

### Bug Fixes

#### Auto-linking when the target note doesn’t exist yet

- **No more UI errors when selecting a suggestion**: Setting Parent/Child/Related to a note that isn’t created yet won’t throw errors or break the editor suggestions.
- **Graceful behavior**: The plugin skips bidirectional updates for missing target notes until they exist.

## 1.5.0 - 1/2/2026

### New Video

- [How I Structure Complex Knowledge in Obsidian (Nexus Properties)](https://www.youtube.com/watch?v=SJIu1qB-wBU)

### New Features

#### Modal-Based Node Creation

Node creation (Parent/Child/Related) now uses a clean modal dialog instead of automatic inline title editing. This provides a more reliable and user-friendly experience:

- **Name Before Create**: Enter the node name in a modal dialog before the file is created
- **No Race Conditions**: Eliminates timing issues with file creation and renaming
- **Cleaner UX**: Clear, centered modal with large input field
- **Keyboard Shortcuts**: Press Enter to create, Escape to cancel
- **Stable Links**: Bidirectional relationship links are created correctly every time

The modal pre-fills with the appropriate pattern based on node type:
- **Parent**: ` - CurrentName` (cursor at start)
- **Child**: `CurrentName - ` (cursor at end)
- **Related**: `CurrentName ` (cursor at end)

#### Multi-Row Layout for Large Hierarchies

Transform how large hierarchies are displayed with intelligent multi-row child positioning that uses vertical space more effectively.

- **Vertical Space Optimization**: Parents with many children now distribute them across multiple staggered rows instead of a single horizontal line
- **Staggered Pattern**: Children are arranged in an alternating pattern (10-9-10-9) where odd rows are offset to fit between nodes in even rows, creating a compact domino-like layout
- **Better Readability**: More zoom-in capability as nodes use both width and height instead of stretching horizontally
- **Generation Tracking**: Automatically accounts for multi-row layouts when positioning grandchildren, ensuring proper spacing between generations
- **Configurable Threshold**: Set the maximum children per row (3-30, default: 10) to control when multi-row layout activates
- **Optional Feature**: Enable/disable in settings

See [Configuration](configuration#multi-row-layout) for setup instructions.

#### Maintain Indirect Connections When Filtering

Added intelligent connection preservation when filtering removes intermediate nodes from the graph.

- **Smart Edge Creation**: When filtering removes nodes that connect other nodes, those connections are automatically maintained
- **Example**: If you have A → B → C and filter out B, the graph will show A → C
- **Configurable**: Toggle "Maintain indirect connections when filtering" in Graph Display settings
- **Default Enabled**: Feature is on by default for better graph coherence
- **Works With**: Both search queries and filter expressions

#### Bases View Archived Toggle

Simplified the bases view interface with a new archived toggle checkbox.

- **Single Toggle**: New "Archived" checkbox on the right side of the view selector replaces separate archived view buttons
- **Cleaner Interface**: Reduced from six buttons (Children, Parent, Related, Archived Children, Archived Parent, Archived Related) to three buttons + one toggle
- **How it Works**: Toggle between regular and archived files for any selected view type (Children, Parent, or Related)
- **Conditional Display**: Only appears when "Exclude Archived" setting is enabled

**Benefits**:
- Saves significant screen space, especially on mobile
- More intuitive interface
- Maintains full archived filtering functionality

See [Bases View Documentation](features/bases-view#archived-toggle) for details.

### Bug Fixes

#### File Rename Relationship Link Updates

Fixed issue where relationship links (Parent/Child/Related) were not properly updated when renaming files. The plugin now correctly handles all wiki link updates during renames, ensuring bidirectional relationships remain intact.

#### Root Directory Wiki Link Generation

Fixed double slash issue in wiki links for files in the root directory.
**Before:** `[[//Parent|Parent]]`
**After:** `[[/Parent|Parent]]`

#### Mobile Graph Rendering
- **Fixed Graph Not Displaying**: Resolved issue where the graph view header consumed all vertical space on mobile, preventing the graph from rendering

#### Complete Mobile Optimization

Nexus Properties now provides a fully optimized mobile experience with comprehensive UI improvements for phones.

**Graph View Mobile Layout**:
- **Fixed Rendering Issues**: Graph now displays properly on all mobile screen sizes without layout problems
- **Compact Header**: Title hidden to save space, all controls condensed into a single row
- **Shortened Labels**: Button text abbreviated ("Related", "All", "Current") to fit more controls
- **Combined Search & Filter**: Search and filter inputs merged into one row with reduced size
- **Hidden Zoom Indicator**: Zoom percentages removed on mobile to reduce clutter

**Mobile Layout Optimizations**:
- **Compact View Switcher**: Toggle button between Graph and Bases views is 30% smaller on mobile
- **Optimized Spacing**: Tighter padding and gaps throughout for maximum content visibility

**Zoom Preview Optimizations**:
- **Auto-Hide Header**: Search bar, filter bar, and controls automatically hide when zooming to maximize preview space
- **Compact Frontmatter**: Properties displayed in a tighter grid showing ~4 properties per row by default
- **Reduced Padding**: Note content uses minimal padding to show more text at once
- **Smaller Elements**: Titles and toggles sized appropriately for mobile screens
- **Touch-Optimized Controls**: All buttons sized for comfortable finger taps

**Touch Interactions**:
- **Long-Press Context Menu**: Hold on a node (~500ms) to open the context menu with all node actions
- **Tap to Zoom**: Single tap still triggers zoom preview as expected
- **Gesture Support**: Standard pinch-to-zoom and pan gestures work throughout

**Configurable Settings**:
- **Mobile Frontmatter Width**: New setting (Graph → Mobile) allows adjusting property width (50-300px) to fit your screen size and preference

---

## 1.4.0 - 12/27/2025

### New Features

#### Render as Root
- **Context Menu Action**: Right-click any node and select "Render as Root" to make it the new root of the hierarchy.
- **Subtree Isolation**: Removes all nodes except the selected node and its complete descendant tree.
- **Clean Focus**: Eliminates parent branches, sibling branches, and all unrelated nodes from view.
- **Automatic Re-centering**: The graph automatically re-centers and fits the remaining subtree for optimal viewing.

#### Center on Source Node
- **Command**: New "Center on Source Node" command to quickly return focus to the original source file.
- **Context-Aware Behavior**:
  - **Not in zoom mode**: Re-centers and fits the entire graph, highlighting the source node.
  - **In zoom mode**: Switches zoom focus to the source node while staying in zoom mode.
- **Smooth Animation**: Uses your configured [Graph Animation Duration](configuration#graph-animation-duration) for consistent transitions.

#### Double-Click Zoom Controls
- **Double Left-Click**: Zoom in toward the clicked position on the graph background.
- **Double Right-Click**: Zoom out from the clicked position on the graph background.
- **Fast and Intuitive**: Quick way to navigate the graph without using scroll wheel or zoom buttons.

#### Zoom Level Indicator
- **Visual Feedback**: Displays current zoom level (e.g., "100%") in the filter row, to the right of filter controls.
- **Editable Input**: Click the zoom indicator to type a specific zoom level.
- **Quick Zoom**: Press Enter to apply or Escape to cancel.
- **Smart Clamping**: Automatically clamps values to valid zoom range (30%-300%).
- **Configurable**: Can be hidden via Settings → Graph → "Show zoom indicator" (enabled by default).

### Improvements

#### Smart Node Creation Workflow
- **Type-Specific Naming**: Node creation now uses intelligent naming patterns based on relationship type:
  - **Create Child Node**: Adds ` - ` at the end (e.g., "Parent - ") with cursor positioned to type the child name
  - **Create Parent Node**: Adds ` - ` at the start (e.g., " - Child") with cursor positioned at the very beginning to type the parent name
  - **Create Related Node**: Adds a space only (e.g., "Note ") with cursor at the end for immediate typing
- **Context-Aware Cursor Positioning**: Cursor automatically positions at the optimal location for each node type, making the naming workflow intuitive and efficient
- **Faster Response**: Reduced focus delay from 100ms to 30ms for snappier interaction

### Bug Fixes

#### Empty Graph When Switching Views
- **Fixed Graph Not Rendering**: Fixed issue where the graph would sometimes appear empty when opening a note with the sidebar collapsed, then opening the sidebar. The graph now automatically renders when the view becomes visible.

#### Reduced Console Noise
- **Suppressed Unnecessary Warnings**: Eliminated console warnings about null or empty frontmatter properties. Empty properties are now silently handled without logging.

#### Graph Relationship Resolution
- **Improved Link Resolution**: Enhanced link resolution to properly handle files in folders using Obsidian's `getFirstLinkpathDest()` API, which respects folder context when resolving relative links. This allows users to use relative link paths for notes.

#### Best Practice Recommendation
- **Use Absolute Paths**: When manually creating wiki links in frontmatter (e.g., `[[Test/Child]]` instead of `[[Child]]`), use absolute paths to avoid ambiguity when multiple files have the same name in different folders.


---

## 1.3.0 - 12/26/2025

### New Features

#### Automatic Node Label Prefix Stripping
- **Cleaner Graph Labels**: Child node labels automatically strip redundant parent name prefixes in hierarchical views, making the graph cleaner and easier to read.
- **Smart Pattern Matching**: Handles three common naming patterns:
  - Parent name + space (e.g., "Females Addictions" → "Addictions")
  - Parent name + " - " (e.g., "Cold Approaching - Only Repels" → "Only Repels")
  - Parent name + "-" (e.g., "Cold Approaching-Real1ty" → "Real1ty")
- **Automatic Application**: Works automatically in hierarchical graph views - no configuration needed.
- **Reduced Visual Clutter**: Eliminates repetitive parent names in child node labels, making relationships clearer at a glance.

#### Improved Node Creation Commands
- **Dash-Based Naming**: Node creation commands (Create Child/Parent/Related Node) now use a dash separator in the filename (e.g., "Current File - " instead of "Current File Child"), making it easier to continue typing meaningful names.
- **Automatic Title Focus**: After creating a new node, the inline title input is automatically focused and the cursor is positioned at the end, allowing you to immediately start typing without clicking.
- **Faster Workflow**: Streamlined node creation process - create and name nodes in one fluid motion.

---

## 1.2.1 - 12/25/2025

### Bug Fixes

#### Settings UI Improvements
- **Fixed Toggle Synchronization**: Fixed issue where "Propagate frontmatter to children" and "Ask before propagating" toggles were not properly synchronized in the settings UI. The toggles now correctly reflect their mutually exclusive state.
- **Fixed Settings Duplication**: Resolved issue where settings sections were being duplicated when toggles were changed. Settings now re-render cleanly without duplication.

---

## 1.2.0 - 12/25/2025

### New Video

- [Nexus Properties — A Hierarchical Knowledge System for Obsidian](https://www.youtube.com/watch?v=Im0SfuBHamo)

### New Features

#### Frontmatter Propagation
- **Automatic Propagation**: Automatically propagate frontmatter changes from parent files to all their children (recursively). Keep your hierarchy synchronized without manual updates.
- **Ask Before Propagating**: Optional confirmation modal that shows which properties changed and how many children will be affected before propagating changes.
- **Excluded Properties**: Configure specific properties that should never be propagated, even when propagation is enabled. Useful for properties that should differ between parent and children.
- **Debounce Delay**: Configurable delay (100ms-10000ms) before propagation occurs, preventing excessive updates during rapid editing sessions. All changes made within the delay are merged and propagated together.
- **Recursive Propagation**: Changes propagate through the entire child hierarchy automatically, ensuring consistency across all descendant files.
- **Smart Change Detection**: Only propagates when actual frontmatter changes are detected, avoiding unnecessary updates.

---

## 1.1.0 - 12/20/2025

### New Features

#### Keyboard Navigation in Zoom Mode
- **Arrow Key Navigation**: Navigate between nodes using arrow keys while in zoom mode. Up/Down arrows follow parent-child relationships, Left/Right arrows move to spatially adjacent nodes.
- **Tree Navigation (Folder Notes)**: Press Enter to jump to the next tree root (right) and Shift+Enter to jump to the previous tree root (left) when viewing folder notes with multiple trees.
- **Smart Context Awareness**: Keyboard shortcuts only work in zoom mode and are disabled when typing in search/filter inputs.

#### Custom Sorting for Bases View
- **Custom Formulas**: Define formulas that map property values to numeric priorities for advanced sorting.
- **Flexible Sort Rules**: Configure multi-level sorting using formulas and built-in properties (e.g., sort by status, then priority, then modification time).
- **Easy Configuration**: Settings provide text areas where you enter YAML content that gets dynamically embedded into base code blocks.

#### Pre-fill Filter Preset
- **Automatic Filter on Startup**: Configure a filter preset to automatically fill the filter input when the graph opens.
- **User Control**: Unlike default filter expressions (which are always applied), pre-fill presets can be cleared or modified by users.
- **Flexible Workflows**: Set helpful starting filters without forcing them permanently.

---

## 1.0.0 - 10/25/2025

- Initial release of Nexus Properties

## Contributing

See [Contributing Guide](contributing) for how to suggest features, report bugs, or contribute code.

## Support

- **Issues**: [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
- **Sponsor**: [Support My Work](https://matejvavroproductivity.com/support/)
