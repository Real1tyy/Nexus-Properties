---
sidebar_position: 4
---

# Node Layout & Constellations

Nexus Properties automatically organizes nodes in the graph for optimal visualization. The layout system uses different algorithms based on the view mode and relationship structure.

## Layout Algorithms

### Dagre Layout (Hierarchical)

Used in **Hierarchical mode** for parent-child trees.

**Characteristics**:
- Top-to-bottom tree structure
- Parent nodes at the top
- Children arranged below
- Automatic spacing between levels
- Prevents node overlap

**Algorithm**: Modified Dagre (Directed Acyclic Graph Rendering)

**Best for**:
- Project hierarchies
- Organizational charts
- Taxonomies
- File system structures

**Example**:
```
         Root
        /    \
    Child1  Child2
      |       |
   Grand1  Grand2
```

### Constellation Layout (Related Networks)

Used in **Related** and **All Related** modes for connected networks.

**Characteristics**:
- Groups of related notes form "constellations"
- Organic, network-style positioning
- Source node in center
- Related nodes distributed radially
- Automatic clustering
- Collision detection

**Best for**:
- Knowledge networks
- Cross-referenced concepts
- Interconnected notes
- Lateral relationships

**Example**:
```
    Node B   Node C
        \    /
        Source
        /    \
    Node D   Node E
```

## Constellation System

### What is a Constellation?

A **constellation** is a group of notes connected through the `Related` property. Notes in a constellation can reach each other by following related links.

**Example constellation**:
```
Note A ↔ Note B ↔ Note C
         ↓
      Note D ↔ Note E
```

All five notes belong to the same constellation because they're all reachable through related links.

### How Constellations Are Built

1. **Start with source node** - The currently focused file
2. **Find direct related** - All notes marked as related
3. **Recursively traverse** - Find notes related to those notes
4. **Respect max depth** - Stop at configured depth limit
5. **Group by cluster** - Organize visually as a constellation

### Constellation Depth

Controlled by [All Related Max Depth](../configuration#all-related-recursion-depth) setting.

**Depth examples**:

**Depth 1** (Direct related only):
```
Source → Note A
Source → Note B
```
Shows: Source, Note A, Note B

**Depth 2** (One level deeper):
```
Source → Note A → Note C
Source → Note B → Note D
```
Shows: Source, Note A, Note B, Note C, Note D

**Depth 3+** (Multiple levels):
```
Source → A → C → E
         ↓
         D → F
```
Shows: Source, A, C, D, E, F

:::tip Performance
Higher depths show more connections but can impact performance. Start with depth 5-10 and adjust based on your vault size.
:::

## Node Positioning

### Hierarchical Positioning

**Parent nodes**:
- Positioned at top of tree
- Centered above children

**Child nodes**:
- Positioned below parent
- Horizontally distributed
- Even spacing

**Sibling nodes**:
- Same vertical level
- Spaced horizontally

**Spacing rules**:
- Vertical spacing: Fixed distance between levels
- Horizontal spacing: Adjusted based on node count
- Wider trees get more horizontal space

### Constellation Positioning

**Source node**:
- Positioned in center
- Acts as anchor point

**First-degree related**:
- Arranged in circle around source
- Even angular distribution

**Multi-degree related**:
- Clustered near their connection point
- Organic distribution
- Collision avoidance

**Spacing rules**:
- Minimum distance between nodes
- Collision detection and resolution
- Gravity towards connected nodes
- Repulsion from non-connected nodes

## Collision Detection

Nexus Properties automatically prevents node overlap:

### Detection System

1. **Check for overlaps** - Compare node bounding boxes
2. **Calculate overlap distance** - How much nodes intersect
3. **Apply repulsion force** - Push nodes apart
4. **Re-check** - Iterate until no overlaps

### Collision Resolver

- Detects overlapping nodes
- Calculates minimum separation distance
- Moves nodes apart while preserving structure
- Respects parent-child relationships
- Maintains constellation coherence

### Manual Adjustment

You can drag nodes to reposition them manually:
- Click and drag any node
- Positions are temporary (not saved)
- Reset by switching view modes
- Useful for screenshots or presentations

## Animation

Layout changes are animated for smooth transitions.

### Animation Duration

Controlled by [Graph Animation Duration](../configuration#graph-animation-duration).

**Settings**:
- **0ms** - Instant layout (no animation)
- **400ms** - Fast, responsive
- **800ms** - Smooth, balanced (default)
- **1500ms+** - Slow, cinematic

### When Animations Trigger

- Switching view modes
- Adding/removing nodes
- Applying filters
- Entering/exiting zoom mode
- Changing "Start from Current"
- Opening a different file

### Performance Considerations

Animations can impact performance on:
- Large graphs (100+ nodes)
- Older hardware
- Mobile devices

Set duration to `0ms` for instant layout if needed.

## Layout Optimization

### Automatic Optimization

The layout system automatically optimizes for:
- Number of nodes
- Screen size
- View mode
- Relationship density

### Node Sizing

- **Title length** - Longer titles = wider nodes
- **Property count** - More properties = taller nodes
- **Display properties** - Shown properties increase height

### Edge Routing

Edges (connections between nodes) are automatically routed:

**Hierarchical mode**:
- Straight lines from parent to child
- Vertical orientation

**Constellation mode**:
- Curved lines between related nodes
- Avoids overlapping edges where possible

## View-Specific Layouts

### Hierarchical Mode Layout

**Root node**:
- Top center position
- Largest vertical space

**Tree expansion**:
- Grows vertically (downward)
- Expands horizontally as needed
- Balanced left-right distribution

**Subtree positioning**:
- Each subtree gets proportional space
- Larger subtrees get more horizontal room

### Related Mode Layout

**Source node**:
- Center position
- Fixed location

**Related nodes**:
- Circle around source
- Equal angular spacing
- Distance based on node count

**Example** (3 related nodes):
```
      Node A
        ↑
   Source → Node B
        ↓
      Node C
```
120° spacing between nodes

### All Related Mode Layout

**Source node**:
- Center-left position
- Anchor for constellation

**Constellation clusters**:
- Grouped by connection distance
- Closely related nodes cluster together
- Distinct groups separated

**Multi-constellation**:
- Each constellation gets a region
- Minimal overlap between constellations

## Customization Tips

### For Large Hierarchies

1. Enable "Start from Current" to focus on subtrees
2. Increase graph width (enlarge feature)
3. Use filtering to show relevant branches
4. Consider splitting into multiple hierarchies

### For Dense Networks

1. Reduce max depth to limit node count
2. Use "Related" mode instead of "All Related"
3. Apply filters to show specific clusters
4. Increase zoom preview height for detail

### For Presentations

1. Disable animations (set to 0ms) for instant layout
2. Manually drag nodes for optimal positioning
3. Use color rules to highlight categories
4. Hide irrelevant nodes with filters
5. Adjust graph size with enlarge feature

## Troubleshooting

### Nodes Overlapping

- System should prevent this automatically
- If it occurs, try:
  - Switch view mode and back
  - Refresh the graph
  - Report as a bug if persistent

### Layout Too Spread Out

- Many nodes can cause wide layouts
- Solutions:
  - Use "Start from Current"
  - Apply filters
  - Reduce max depth
  - Increase graph width

### Layout Too Cramped

- Too many nodes in small space
- Solutions:
  - Use enlarge feature
  - Hide less important nodes with filters
  - Split into multiple graphs
  - Focus on subtrees

### Slow Layout Updates

- Large graphs can be slow to layout
- Solutions:
  - Set animation duration to 0ms
  - Reduce max depth
  - Limit directory scanning
  - Use filtering to reduce node count

## Technical Details

### Layout Engine

- **Library**: Cytoscape.js with Dagre extension
- **Algorithm**: Modified force-directed layout
- **Optimization**: Incremental updates, not full re-layout

### Performance

- **Small graphs** (< 50 nodes): < 100ms
- **Medium graphs** (50-200 nodes): 100-500ms
- **Large graphs** (200+ nodes): 500ms-2s

Times include animation duration.

### Caching

- Node positions cached during session
- Reset on view mode change
- Invalidated on graph updates

## Next Steps

- [Learn about Graph Views](graph-views) to understand when each layout is used
- [Customize Graph Settings](../configuration#graph-display) to optimize layout
- [Use Filtering](filtering) to focus on subsets
- [Apply Color Rules](color-rules) to add visual organization
