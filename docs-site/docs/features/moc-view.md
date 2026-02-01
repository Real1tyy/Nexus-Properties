---
sidebar_position: 5
---

# MOC View

Map of Content (MOC) view renders your hierarchy as an interactive collapsible tree with clickable wiki links. Perfect for exploring your knowledge structure at a glance.

## Opening MOC View

The view switcher cycles through three modes: **Graph → Bases → MOC**

- **Toggle button**: Click "Switch to MOC" in the view header
- **Command**: "Toggle View Mode (Graph/Bases/MOC)"

## Tree Structure

MOC displays notes in a hierarchical outline format:

```
- [[Current Note]]
    - [[Child 1]]
        - [[Grandchild 1]]
        - [[Grandchild 2]]
    - [[Child 2]]
```

Each level is indented to show parent-child relationships clearly. Items with children have a collapse/expand chevron.

## Root Mode Toggle

Switch between two root modes using the toggle button in the toolbar:

### Current (Default)

Tree starts from the active file as root, showing only its descendants.

```
- [[Active File]] ← root
    - [[Child 1]]
    - [[Child 2]]
```

### Top Parent

Traverses upward to find the topmost ancestor, then renders the full tree with your current file highlighted.

```
- [[Topmost Ancestor]] ← root (traversed upward)
    - [[Intermediate Parent]]
        - [[Active File]] ← highlighted
            - [[Child 1]]
            - [[Child 2]]
```

This uses the same traversal algorithm as the Graph view, respecting the **Prioritize Parent** setting for notes with multiple parents.

## Navigation

### Click

Click any note to open it in the current pane.

### Ctrl+Click (Cmd+Click on Mac)

Open note in a new tab.

### Expand/Collapse

- **Chevron**: Click to toggle individual branches
- **Expand All**: Show all nested children
- **Collapse All**: Hide all children

## Visual Indicators

- **Current file**: Highlighted with accent background color (in Top Parent mode)
- **Depth styling**: Root items are larger/bolder, deeper items are smaller/muted
- **Vertical lines**: Connect parent to children visually

## Cycle Detection

The view handles circular relationships gracefully. If a note appears in its own ancestry chain, it won't cause infinite loops.

## Use Cases

- **Map of Content**: Create visual outlines of topic hierarchies
- **Project Overview**: See all tasks/subtasks in a project
- **Knowledge Exploration**: Navigate through related concepts

## Next Steps

- [Graph Views](graph-views) - Visual network exploration
- [Bases View](bases-view) - List-based relationship view
- [Bidirectional Sync](bidirectional-sync) - Relationship management
