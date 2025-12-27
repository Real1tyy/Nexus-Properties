---
sidebar_position: 101
---

# Changelog

All notable changes to Nexus Properties will be documented here.

## 1.4.0

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

## 1.3.0

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

## 1.2.1

### Bug Fixes

#### Settings UI Improvements
- **Fixed Toggle Synchronization**: Fixed issue where "Propagate frontmatter to children" and "Ask before propagating" toggles were not properly synchronized in the settings UI. The toggles now correctly reflect their mutually exclusive state.
- **Fixed Settings Duplication**: Resolved issue where settings sections were being duplicated when toggles were changed. Settings now re-render cleanly without duplication.

---

## 1.2.0

### New Features

#### Frontmatter Propagation
- **Automatic Propagation**: Automatically propagate frontmatter changes from parent files to all their children (recursively). Keep your hierarchy synchronized without manual updates.
- **Ask Before Propagating**: Optional confirmation modal that shows which properties changed and how many children will be affected before propagating changes.
- **Excluded Properties**: Configure specific properties that should never be propagated, even when propagation is enabled. Useful for properties that should differ between parent and children.
- **Debounce Delay**: Configurable delay (100ms-10000ms) before propagation occurs, preventing excessive updates during rapid editing sessions. All changes made within the delay are merged and propagated together.
- **Recursive Propagation**: Changes propagate through the entire child hierarchy automatically, ensuring consistency across all descendant files.
- **Smart Change Detection**: Only propagates when actual frontmatter changes are detected, avoiding unnecessary updates.

---

## 1.1.0

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

## 1.0.0
- Initial release of Nexus Properties

## Contributing

See [Contributing Guide](contributing) for how to suggest features, report bugs, or contribute code.

## Support

- **Issues**: [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
- **Sponsor**: [GitHub Sponsors](https://github.com/sponsors/Real1tyy)
