---
sidebar_position: 1
---

# Features Overview

Nexus Properties provides a comprehensive suite of features for managing and visualizing relationships in your Obsidian vault. This page gives you a bird's-eye view of what the plugin can do.

## Core Features

### 🔗 Bidirectional Relationship Management

Automatically synchronize parent-child and related relationships across your vault.

- Set a child in one file, parent is auto-updated in the other
- Create related connections that sync bidirectionally
- Automatic sibling linking (optional)
- Recursive tree computation

**[Learn more →](bidirectional-sync)**

---

### 📊 Interactive Relationship Graph

Visualize your knowledge network with multiple viewing modes and layouts.

**View Modes:**
- **Hierarchical** - Parent-child tree structures
- **Related** - Direct related connections
- **All Related** - Entire constellations of related notes
- **Start from Current** - Focus on specific nodes

**[Learn more →](graph-views)**

---

### 📝 Bases View

A focused, list-based view of the current note's relationships.

**Features:**
- **Children** - Notes that reference the current note as a parent
- **Parent** - Notes that reference the current note as a child
- **Related** - Notes with mutual related connections
- Automatically filters out archived notes
- Real-time updates when switching notes
- Clean, linear navigation interface

Perfect for focused work on a single note's context without visual clutter.

**[Learn more →](bases-view)**

---

### 🎨 Node Color Rules

Apply conditional colors to nodes based on frontmatter properties.

- Create JavaScript expressions to define color rules
- Unlimited custom rules with priority ordering
- Visual categories for instant identification
- Supports hex, HSL, and named CSS colors

**[Learn more →](color-rules)**

---

### 🔍 Filtering System

Focus on relevant parts of your knowledge network with powerful filtering.

- JavaScript expression-based filtering
- Named filter presets for quick access
- Multi-expression AND logic
- Filter persists across sessions

**[Learn more →](filtering)**

---

### 🔬 Zoom Mode

Deep-dive into any node with inline preview.

- Click any node to enter zoom mode
- View frontmatter and content inline
- Navigate between nodes without leaving the graph
- Use arrow keys for keyboard navigation (Up/Down for parent/child, Left/Right for spatial)
- Toggle visibility of frontmatter/content sections

**[Learn more →](zoom-mode)**

---

### 🎯 Context Menus

Right-click any node or edge for quick actions.

**Node Context Menu:**
- Open file
- Open in new tab
- Add parent/child/related relationships
- Edit node frontmatter
- View node preview
- Copy node path

**Edge Context Menu:**
- Remove relationship
- Navigate to connected nodes
- View relationship details

**[Learn more →](context-menus)**

---

### 💬 Property Tooltips

Hover over nodes to see their properties instantly.

- Shows all frontmatter properties
- Clickable wiki links in tooltips
- Configurable width
- Respects hide empty/underscore settings
- Can be toggled with hotkey

**[Learn more →](tooltips)**

---

### 🔎 Graph Search

Quickly find and highlight nodes in the graph.

- Real-time search as you type
- Highlights matching nodes
- Dims non-matching nodes
- Keyboard-accessible
- Toggle with command

**[Learn more →](search)**

---

### ⚡ Quick Node Creation

Create parent, child, or related nodes instantly from commands.

- **Create Parent Node** - Creates a parent with bidirectional link
- **Create Child Node** - Creates a child with bidirectional link
- **Create Related Node** - Creates a related node with bidirectional link

All new nodes:
- Inherit frontmatter properties (except excluded)
- Get unique Zettel IDs automatically
- Establish bidirectional relationships
- Open immediately for editing

**[Learn more →](node-creation)**

---

### 🗂️ Smart Layout System

Automatic organization of nodes for optimal visualization.

**Constellation-Based:**
- Groups of related notes form constellations
- Automatic spacing and collision detection
- Hierarchical arrangement for parent-child
- Radial arrangement for related networks

**Layout Modes:**
- **Dagre** - Tree layout for hierarchies
- **Constellation** - Grouped layout for related networks
- Automatic switching based on view mode

**[Learn more →](node-layout)**

---

### ⚙️ Property Exclusion

Control which properties are copied when creating new nodes.

- Default exclusion list applies to all nodes
- Path-based rules for specific directories
- Exclude relationship and system properties
- Customizable per-directory rules

**[Learn more →](excluded-properties)**

---

## Integration Features

### Directory Scanning

- Scan entire vault or specific directories
- Automatic indexing of new files
- Real-time relationship updates
- Manual rescan option for full vault sync

### Command Palette Integration

All major features accessible via command palette:
- Show/hide graph view
- Toggle search, filter, presets
- Enlarge graph
- Create nodes
- Toggle zoom features

### Hotkey Support

Assign custom hotkeys to any command:
- Show relationship graph
- Toggle features
- Navigate graph
- Create nodes
- And more...

---

## View Modes Comparison

| Mode | Purpose | Best For |
|------|---------|----------|
| **Hierarchical** | Show parent-child trees | Project hierarchies, outlines |
| **Related** | Show direct related links | Exploring connections |
| **All Related** | Show entire constellations | Discovering indirect connections |
| **Start from Current** | Focus on current file | Limiting scope to one node |
| **Bases View** | List current note's relationships | Focused navigation, quick review |

---

## Technical Features

### Performance Optimizations

- Incremental graph updates
- Lazy loading for large networks
- Configurable animation duration
- Efficient collision detection
- Debounced resize handling

### Data Consistency

- Automatic bidirectional sync
- Orphaned relationship cleanup
- File deletion handling
- Rename/move tracking
- Transaction-based updates

### Extensibility

- JavaScript expression engine
- Custom color rules
- Filter presets
- Property-based customization
- Directory-based configurations

---

## Feature Matrix

| Feature | Free | Description |
|---------|------|-------------|
| Bidirectional Sync | ✅ | Automatic relationship synchronization |
| Graph Visualization | ✅ | Interactive relationship graph |
| Multiple View Modes | ✅ | Hierarchical, Related, All Related |
| Bases View | ✅ | List-based relationship view |
| Color Rules | ✅ | Unlimited conditional node colors |
| Filtering | ✅ | Expression-based filtering |
| Filter Presets | ✅ | Named filter shortcuts |
| Zoom Mode | ✅ | Inline node preview |
| Context Menus | ✅ | Right-click actions |
| Tooltips | ✅ | Property previews on hover |
| Search | ✅ | Real-time node search |
| Node Creation | ✅ | Quick parent/child/related creation |
| Layout Optimization | ✅ | Automatic constellation layout |
| Property Exclusion | ✅ | Control property inheritance |
| Directory Scanning | ✅ | Selective vault indexing |
| Hotkey Support | ✅ | Custom keyboard shortcuts |

:::info Open Source
All features are free and open source under the MIT license!
:::

---

## What's Next?

Explore each feature in detail:

1. **Start with the basics**: [Bidirectional Sync](bidirectional-sync)
2. **Master the graph**: [Graph Views](graph-views)
3. **Add visual categories**: [Color Rules](color-rules)
4. **Focus your view**: [Filtering](filtering)
5. **Dive deeper**: [Zoom Mode](zoom-mode)
6. **Speed up your workflow**: [Node Creation](node-creation)

Or jump to [Configuration](../configuration) to customize everything!
