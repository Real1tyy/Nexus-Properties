---
sidebar_position: 10
---

# Context Menus

Right-click nodes or edges for quick actions.

## Node Context Menu

**Open File**: Opens in current tab

**Open in New Tab**: Opens in new tab (or double-click node)

**Add Parent/Child/Related**: Activates relationship adder mode

**Edit Node**: Opens frontmatter editor modal (not implemented yet)

**View Node Preview**: Opens read-only preview modal (alternative: [Zoom Mode](zoom-mode))

**Copy Node Path**: Copies full file path to clipboard

## Edge Context Menu

**Remove Relationship**: Removes relationship from both nodes' frontmatter

**Navigate to Source**: Focuses on source node

**Navigate to Target**: Focuses on target node

## Relationship Adder

**Activate**: Right-click node → "Add Parent/Child/Related"

**Select target**: Click another node to create relationship

**Cancel**: Press Escape, right-click anywhere, or click outside graph

**Visual feedback**: Status bar shows current mode

**Validation**: Prevents circular relationships and duplicates

## Quick Actions

**Restructure hierarchy**: Right-click child → "Add Parent" → Click new parent

**Link concepts**: Right-click concept → "Add Related" → Click related concept

**Clean up**: Right-click edge → "Remove Relationship"

**Preview**: Right-click node → "View Node Preview"

**Copy reference**: Right-click node → "Copy Node Path"

## Next Steps

- [Node Creation](node-creation) - Create new related nodes
- [Zoom Mode](zoom-mode) - Alternative to preview
- [Bidirectional Sync](bidirectional-sync) - Relationship management
- [Graph Views](graph-views) - Visualize relationships
