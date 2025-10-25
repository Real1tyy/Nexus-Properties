---
sidebar_position: 3
---

# Graph Views

Nexus Properties provides multiple viewing modes to visualize your knowledge network. Each mode reveals different aspects of your note relationships and helps you navigate your vault in unique ways.

## Opening the Graph

There are three ways to open the Relationship Graph:

1. **Ribbon Icon** - Click the fork icon in the left sidebar (if enabled)
2. **Command Palette** - `Ctrl/Cmd+P` → "Show Relationship Graph"
3. **Command** - "Nexus Properties: Show Relationship Graph"

The graph opens in the left sidebar by default.

## View Mode Selector

The view mode dropdown is located in the graph header. Use it to switch between different visualization modes.

## View Modes

### Hierarchical Mode

**Purpose**: Display parent-child tree structures
**Best for**: Project hierarchies, outlines, taxonomies

Shows the complete hierarchy starting from the root (topmost parent) down through all descendants.

**What's shown**:
- The source file (or its root parent)
- All parent nodes up to the root
- All child nodes recursively
- Sibling nodes (if auto-link siblings is enabled)

**Example use cases**:
- Project management with tasks and subtasks
- Book outlines with chapters and sections
- Academic hierarchies (topics → subtopics → concepts)
- File system-like structures

**Layout**: Tree layout with parent at top, children below

```
         Project
        /    |    \
    Task 1 Task 2 Task 3
      |
   Subtask 1.1
```

:::tip Start from Current
Enable "Start from Current" to begin the hierarchy at the currently open file instead of traversing up to the root. This is useful for viewing just a subtree.
:::

### Related Mode

**Purpose**: Show direct related connections
**Best for**: Exploring immediate connections

Shows only the source file and its directly related notes (one hop away).

**What's shown**:
- The source file
- All notes marked as "Related" in the source file's frontmatter
- All notes that mark the source file as "Related"

**Example use cases**:
- Finding related concepts
- Seeing cross-references
- Discovering similar notes
- Exploring lateral connections

**Layout**: Radial layout with source in center, related nodes around it

```
    Note B
      |
Note A ← Source → Note C
      |
    Note D
```

### All Related Mode

**Purpose**: Explore entire constellations of related notes
**Best for**: Discovering indirect connections, seeing the full network

Shows the source file and ALL related notes recursively, up to the configured max depth.

**What's shown**:
- The source file
- All directly related notes
- All notes related to those notes
- Continues recursively up to [max depth](../configuration#all-related-recursion-depth)

**Example constellation**:
```
Note A ↔ Note B ↔ Note C
         ↓
      Note D ↔ Note E
         ↓
      Note F
```

If you view `Note A` with max depth 3+:
- **Depth 1**: Note A (source), Note B (direct)
- **Depth 2**: Note C, Note D (related to B)
- **Depth 3**: Note E, Note F (related to D)

**Example use cases**:
- Discovering hidden connections
- Exploring knowledge clusters
- Finding indirect relationships
- Seeing the full scope of a topic

**Layout**: Constellation layout - clusters of related nodes grouped together

:::warning Performance
Large constellations can impact performance. If the graph becomes slow, reduce the [All Related Max Depth](../configuration#all-related-recursion-depth) setting.
:::

### Start from Current File

**Toggle**: "Start from Current" checkbox in graph header
**Works with**: All view modes

When enabled, the graph shows relationships starting from the currently open file rather than traversing to the root.

**Hierarchical mode**:
- Without: Shows from topmost parent down
- With: Shows from current file down (subtree only)

**Example**:
```
Full hierarchy:
    Root
     ├── Parent
     │   ├── Current File ← You are here
     │   │   ├── Child 1
     │   │   └── Child 2
     │   └── Sibling
     └── Uncle
```

**Start from Current OFF** (default):
- Shows: Root, Parent, Current File, Sibling, Child 1, Child 2
- Also shows: Uncle (descendant of root)

**Start from Current ON**:
- Shows: Current File, Child 1, Child 2
- Hides: Root, Parent, Sibling, Uncle

:::tip Use Case
Enable this when you want to focus on just the children/descendants of a specific node without seeing the rest of the hierarchy.
:::

## Graph Header Controls

The graph header contains several controls:

### File Name Display

Shows the name of the currently focused file. Click to open the file in a new tab.

### View Mode Dropdown

**Options**:
- Hierarchical
- Related
- All Related

Changes how the graph interprets and displays relationships.

### Include All Related Checkbox

Only visible in "Hierarchical" mode. When checked, adds all related notes (and their constellations) to the hierarchy view.

**Example**:
```
Project (parent-child hierarchy)
├── Task 1
└── Task 2

Task 1 Related To:
- Note A → Note B → Note C
```

With "Include All Related" checked, the graph shows:
- The hierarchy (Project, Task 1, Task 2)
- The related constellation (Note A, Note B, Note C)

### Start from Current Checkbox

When checked, starts the graph from the current file instead of the root parent.

## Layout Behavior

### Hierarchical Layout (Dagre)

- Tree-like structure
- Parent nodes at top
- Children below
- Automatic spacing based on node count
- Vertical alignment

### Constellation Layout

Used for Related and All Related modes:
- Groups of connected notes
- Organic, network-style layout
- Automatic clustering
- Collision detection
- Radial distribution

### Animation

Layout changes are animated by default. The animation duration can be configured in [Graph Settings](../configuration#graph-animation-duration).

Set to `0ms` for instant layout (performance mode).

## Source Node Highlighting

The source node (the file you're currently viewing) is always highlighted in the graph:

- **Border**: Thicker border (3px)
- **Border color**: Bright blue (`#2563eb`)
- **Always visible**: Never hidden by filters

## Interaction

### Click Behavior

**Single click**: Enter [Zoom Mode](zoom-mode)
- Preview panel appears
- Node is focused
- Can navigate between nodes

**In Zoom Mode click**: Switch focus to clicked node
- Updates preview panel
- Moves focus highlight
- Maintains zoom mode

**Double click**: Open file in new tab

### Right-Click

Opens [Context Menu](context-menus) with actions:
- Open file
- Open in new tab
- Add relationships
- Edit node
- Preview node
- Copy path

### Hover

After 1 second, shows [Property Tooltip](tooltips) with frontmatter

### Drag

- Pan the graph view
- Rearrange nodes (positions not saved)

### Scroll

- Zoom in/out
- Pinch to zoom on trackpads

## Comparing View Modes

| Feature | Hierarchical | Related | All Related |
|---------|-------------|---------|-------------|
| **Shows parent-child** | ✅ Yes, full tree | ❌ No | ⚠️ If in constellation |
| **Shows related** | ⚠️ Optional | ✅ Direct only | ✅ Recursive |
| **Recursion depth** | Unlimited | 1 hop | Configurable (1-20) |
| **Best for** | Hierarchies | Immediate connections | Full networks |
| **Layout** | Tree | Radial | Constellation |
| **Performance** | Fast | Fast | Can be slow |
| **Start from current** | ✅ Supported | ✅ Supported | ✅ Supported |

## Common Use Cases

### Exploring a Project Hierarchy

1. Open a project file
2. Select "Hierarchical" mode
3. Disable "Start from Current" to see the full tree
4. Use [Search](search) to find specific tasks
5. Use [Zoom Mode](zoom-mode) to preview task details

### Finding Related Concepts

1. Open a concept note
2. Select "Related" mode
3. See all directly related concepts
4. Click any related note to explore its connections
5. Use [Color Rules](color-rules) to categorize by type

### Discovering Hidden Connections

1. Open any note
2. Select "All Related" mode
3. Increase [max depth](../configuration#all-related-recursion-depth) if needed
4. See the entire constellation
5. Use [Filtering](filtering) to focus on specific properties

### Focusing on a Subtree

1. Open a mid-level note in a hierarchy
2. Select "Hierarchical" mode
3. Enable "Start from Current"
4. See only children/descendants
5. Use [Context Menu](context-menus) to quickly create children

## Tips & Tricks

### Performance Optimization

- Use "Related" mode for quick exploration
- Limit max depth in "All Related" mode
- Enable "Start from Current" to reduce nodes shown
- Use [filtering](filtering) to hide irrelevant nodes

### Navigation

- Use keyboard shortcuts to toggle view modes (configure in settings)
- Double-click nodes to open in new tab
- Use [Search](search) to quickly find nodes
- Right-click for quick actions

### Visual Organization

- Use [Color Rules](color-rules) to distinguish node types
- Display key properties in nodes
- Enable tooltips for detailed information
- Adjust graph size for your screen

## Troubleshooting

### No Nodes Appearing

- Check that the file is in a [scanned directory](../configuration#directory-scanning)
- Verify the file has relationships (`Parent`, `Child`, or `Related`)
- Check that [filters](filtering) aren't hiding all nodes
- Try "All Related" mode to see if any connections exist

### Too Many Nodes

- Enable "Start from Current"
- Use "Related" mode instead of "All Related"
- Reduce [max depth](../configuration#all-related-recursion-depth)
- Apply [filters](filtering) to show only relevant nodes

### Performance Issues

- Reduce [animation duration](../configuration#graph-animation-duration)
- Lower [max depth](../configuration#all-related-recursion-depth)
- Limit [directory scanning](../configuration#directory-scanning)
- Use [filtering](filtering) to reduce node count

## Next Steps

- [Learn about Node Layout](node-layout) to understand how nodes are positioned
- [Use Search](search) to quickly find nodes in large graphs
- [Apply Filters](filtering) to focus on specific subsets
- [Try Zoom Mode](zoom-mode) to explore nodes in detail
- [Customize Colors](color-rules) to add visual categories
