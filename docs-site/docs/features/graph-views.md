---
sidebar_position: 3
---

# Graph Views

Visualize relationships with multiple viewing modes. Each mode reveals different aspects of your knowledge network.

![Hierarchical View](/img/screenshots/hierarchical-view.png)
*Hierarchical view with parent-child tree structure*

## Opening the Graph

- **Ribbon icon**: Fork icon in left sidebar
- **Command**: "Show Relationship Graph"

## View Modes

### Hierarchical

**Shows**: Complete parent-child tree from root down
**Layout**: Tree with parent at top, children below
**Best for**: Projects, outlines, taxonomies

**Start from Current**: Enable to show only subtree from current file (excludes ancestors)

**Include All Related**: Add related constellations to hierarchy view

## Node Labels

Graph nodes display the `Title` property from each file's frontmatter. This title is automatically managed by the plugin as a wiki link:

- **Format**: `[[path/to/file|DisplayName]]`
- **With Parent**: Display name = filename with parent prefix stripped (e.g., "Parent - Child" → "Child")
- **Without Parent**: Display name = file basename

**Supported prefix patterns**:
- `Parent - Child` → "Child"
- `Parent Child` → "Child"
- `Parent-Child` → "Child"

**Benefits**:
- Cleaner, more readable labels in both Graph and Bases views
- Clickable links in Bases view for easy navigation
- No redundant parent names cluttering the display
- Pre-computed for faster rendering

The title property is updated automatically when:
- A file is created or modified
- Parent relationships change
- You run "Rescan All Files" command

See [Configuration](../configuration#node-creation-shortcuts) for property name settings.

## Depth Control

Control how deeply the graph traverses hierarchical relationships with the depth slider in the graph view header.

### How It Works

**Viewing Window**: The slider controls how many levels are shown in the hierarchy:
- Depth 3 viewing node E in A → B → C → D → E:
  - Finds an ancestor at the right level → starts at C
  - Builds down 3 levels → shows C, D, E and all descendants

**Smart Depth Selection**:
- **Hierarchy views** (parent/child): Uses [Hierarchy Max Depth](../configuration#hierarchy-max-depth) setting
- **All Related views** (constellation): Uses [All Related Recursion Depth](../configuration#all-related-recursion-depth) setting

**Temporary Adjustments**: Slider changes don't save to settings - they only affect your current session

**Live Updates**: Graph and statistics recalculate immediately as you adjust

**Toggle visibility**: Enable/disable slider in Settings → User Interface → "Show depth slider in graph view"

See [Configuration](../configuration#depth-settings) for default depth values.

### Related

**Shows**: Source file + directly related notes (1 hop)

**Layout**: Radial with source in center

**Best for**: Exploring immediate connections

![Related View](/img/screenshots/related-view.png)
*Related view with radial layout*

### All Related

**Shows**: Entire constellation recursively up to [max depth](../configuration#all-related-recursion-depth)

**Layout**: Constellation clusters

**Best for**: Discovering indirect connections, full networks

![All Related View](/img/screenshots/all-related-view.png)
*All Related view showing entire constellation*

:::warning Performance
Large constellations can be slow. Reduce max depth if needed.
:::

## Interaction

**Single click**: Enter [Zoom Mode](zoom-mode)

**Double click**: Open in new tab

**Right-click**: [Context Menu](context-menus)

**Hover**: [Tooltip](tooltips) after 1 second

**Drag**: Pan graph or move nodes (not saved)

**Scroll**: Zoom in/out

**Double left-click**: Zoom in toward clicked position (on background)

**Double right-click**: Zoom out from clicked position (on background)

**Zoom indicator**: Click the zoom level display (in filter row) to type a specific zoom percentage

**Center on Source**: Use the "Center on Source Node" command to quickly return to the original source file's position (or switch zoom focus if in zoom mode)

## Next Steps

- [MOC View](moc-view) - Collapsible tree outline view
- [Node Layout](node-layout) - How nodes are positioned
- [Filtering](filtering) - Focus on subsets
- [Zoom Mode](zoom-mode) - Explore nodes in detail
- [Color Rules](color-rules) - Visual categories
