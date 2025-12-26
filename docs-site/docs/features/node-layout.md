---
sidebar_position: 4
---

# Node Layout

Automatic node positioning using different algorithms based on view mode.

## Layout Algorithms

### Dagre (Hierarchical)

**Used in**: Hierarchical mode

**Structure**: Top-to-bottom tree

**Features**: Parent at top, children below, automatic spacing, prevents overlap

**Best for**: Projects, org charts, taxonomies

### Constellation (Related Networks)

**Used in**: Related and All Related modes

**Structure**: Organic network

**Features**: Source in center, radial distribution, clustering, collision detection

**Best for**: Knowledge networks, cross-referenced concepts

## Constellations

**Definition**: Group of notes connected through `Related` property

**Building**:
1. Start with source node
2. Find direct related notes
3. Recursively traverse up to [max depth](../configuration#all-related-recursion-depth)
4. Group visually as constellation

**Depth examples**:
- **Depth 1**: Source + direct related only
- **Depth 2**: Source + related + their related
- **Depth 3+**: Multiple levels deep

:::tip Performance
Higher depths show more connections but impact performance. Start with 5-10.
:::

## Collision Detection

**System**: Automatically prevents node overlap

**Process**: Detects overlaps → Calculates separation → Applies repulsion → Re-checks

**Manual adjustment**: Drag nodes (positions not saved, reset on view change)

## Animation

**Duration**: [Configurable](../configuration#graph-animation-duration) (0ms = instant, 800ms = default)

**Triggers**: View mode changes, add/remove nodes, filters, zoom mode, file changes

**Performance**: Set to 0ms for large graphs (100+ nodes)

## View-Specific Layouts

**Hierarchical**: Root at top center, tree grows downward, balanced left-right

**Related**: Source in center, related in circle with equal angular spacing

**All Related**: Source center-left, constellation clusters grouped by connection distance

## Next Steps

- [Graph Views](graph-views) - When each layout is used
- [Filtering](filtering) - Focus on subsets
- [Color Rules](color-rules) - Visual organization
