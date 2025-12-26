---
sidebar_position: 3
---

# Graph Views

Visualize relationships with multiple viewing modes. Each mode reveals different aspects of your knowledge network.

## Opening the Graph

- **Ribbon icon**: Fork icon in left sidebar
- **Command**: "Show Relationship Graph"

## View Modes

### Hierarchical

**Shows**: Complete parent-child tree from root down
**Layout**: Tree with parent at top, children below
**Best for**: Projects, outlines, taxonomies

**Node labels**: Automatically strips redundant parent name prefixes
- "Health Nutrition" → "Nutrition" under "Health"
- "Parent-Child" → "Child" under "Parent"

**Start from Current**: Enable to show only subtree from current file (excludes ancestors)

**Include All Related**: Add related constellations to hierarchy view

### Related

**Shows**: Source file + directly related notes (1 hop)
**Layout**: Radial with source in center
**Best for**: Exploring immediate connections

### All Related

**Shows**: Entire constellation recursively up to [max depth](../configuration#all-related-recursion-depth)
**Layout**: Constellation clusters
**Best for**: Discovering indirect connections, full networks

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

## Next Steps

- [Node Layout](node-layout) - How nodes are positioned
- [Search](search) - Find nodes quickly
- [Filtering](filtering) - Focus on subsets
- [Zoom Mode](zoom-mode) - Explore nodes in detail
- [Color Rules](color-rules) - Visual categories
