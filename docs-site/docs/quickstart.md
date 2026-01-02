---
sidebar_position: 3
---

# Quick Start Guide

Get up and running with Nexus Properties in 5 minutes! This guide will walk you through creating your first relationship network.

## Step 1: Open the Relationship Graph

There are three ways to open the Relationship Graph view:

1. **Ribbon Icon**: Click the fork icon in the left sidebar (if enabled in settings)
2. **Command Palette**: Press `Ctrl/Cmd+P` and search for "Show Relationship Graph"
3. **Command**: Use the command "Nexus Properties: Show Relationship Graph"

The graph view will open in the left sidebar by default.

## Step 2: Create Your First Parent-Child Relationship

Let's create a simple hierarchy to understand how Nexus Properties works.

### Create a Parent Note

1. Create a new note called `Project Overview.md`
2. Add frontmatter at the top of the file:

```yaml
---
Child:
  - "[[Task 1]]"
  - "[[Task 2]]"
---
```

### Create Child Notes

Create two new notes: `Task 1.md` and `Task 2.md`.

**You don't need to add anything to these notes!** Nexus Properties will automatically update them.

### See the Magic ✨

Open `Task 1.md` or `Task 2.md` and check their frontmatter. You'll see that Nexus Properties automatically added:

```yaml
---
Parent: "[[Project Overview]]"
---
```

**That's bidirectional sync in action!** When you set a child relationship in one file, the parent relationship is automatically created in the other file.

## Step 3: View Your Hierarchy in the Graph

1. Open `Project Overview.md`
2. Look at the Relationship Graph view
3. You should see three nodes:
   - Project Overview (the root)
   - Task 1 (connected as a child)
   - Task 2 (connected as a child)

### Try Different View Modes

Use the dropdown in the graph header to try different views:

- **Hierarchical** - Shows the parent-child tree (current view)
- **Related** - Shows direct related connections
- **All Related** - Shows all connected nodes in the constellation
- **Start from Current** - Focuses on the current file instead of the root

## Step 4: Add Related Relationships

Let's connect Task 1 and Task 2 as related items.

1. Open `Task 1.md`
2. Add to the frontmatter:

```yaml
---
Parent: "[[Project Overview]]"
Related:
  - "[[Task 2]]"
---
```

3. Open `Task 2.md` and check its frontmatter:

```yaml
---
Parent: "[[Project Overview]]"
Related:
  - "[[Task 1]]"
---
```

**Both tasks are now marked as related to each other!** This is another example of bidirectional sync.

## Step 5: Explore the Graph

Now that you have a basic network, let's explore the graph features:

### Zoom Mode

1. Click any node in the graph
2. A preview panel appears at the bottom showing the file's content
3. Click the node again to exit zoom mode
4. Use the eye icons to toggle frontmatter and content visibility

### Context Menu

1. Right-click any node in the graph
2. You'll see options to:
   - Open the file
   - Open in new tab
   - Add Parent/Child/Related relationships
   - Edit the node's frontmatter
   - View node preview
   - Copy node path

### Tooltips

1. Hover over any node for 1 second
2. A tooltip appears showing the node's frontmatter properties
3. You can click links inside the tooltip to navigate

## Step 6: Create Nodes Quickly

Nexus Properties provides commands to quickly create related nodes with a clean modal interface:

1. Open `Project Overview.md`
2. Open command palette (`Ctrl/Cmd+P`)
3. Search for "Create Child Node"
4. A modal dialog appears with the name pre-filled as `Project Overview - `
5. **Type the child name** (cursor is positioned at the end, ready to type)
6. Press **Enter** to create or **Escape** to cancel
7. The new child note will be created with:
   - The exact name you entered
   - All properties inherited from the parent
   - Automatic bidirectional relationship
   - A unique Zettel ID

### Smart Naming by Node Type

The modal pre-fills the name based on the node type:

- **Create Child Node**: `ParentName - ` (cursor at end - type the child name)
- **Create Parent Node**: ` - ChildName` (cursor at beginning - type the parent name)
- **Create Related Node**: `NoteName ` (cursor at end - type the related name)

This approach ensures stable, reliable node creation without any timing issues!

## Step 7: Add Visual Categories with Color Rules

Let's make the graph more visual by adding color rules:

1. Open Settings → Nexus Properties → Node colors
2. Click "Add Rule"
3. Add an expression like: `status === 'complete'`
4. Choose a green color
5. Click "Add Rule" again
6. Add: `status === 'pending'`
7. Choose a yellow color

Now add a `status` property to your notes:

```yaml
---
Parent: "[[Project Overview]]"
status: complete
---
```

The nodes will change color based on their status!

## Step 8: Filter the Graph

You can filter the graph to show only specific nodes:

1. Open command palette (`Ctrl/Cmd+P`)
2. Search for "Toggle Graph Filter"
3. Enter a filter expression: `status === 'pending'`
4. Only nodes with `status: pending` will be shown

## Next Steps

Now that you understand the basics, explore more advanced features:

- [Learn about all Graph View modes](features/graph-views)
- [Master Color Rules](features/color-rules)
- [Understand Filtering](features/filtering)
- [Explore Node Layouts](features/node-layout)
- [Configure all Settings](configuration)

## Common Workflows

### Project Management

```yaml
---
# Project.md
Child:
  - "[[Task 1]]"
  - "[[Task 2]]"
  - "[[Task 3]]"
status: active
priority: high
---
```

### Knowledge Hierarchy

```yaml
---
# Concept.md
Child:
  - "[[Sub-concept A]]"
  - "[[Sub-concept B]]"
Related:
  - "[[Related Concept]]"
type: concept
---
```

### Research Papers

```yaml
---
# Main Paper.md
Related:
  - "[[Supporting Study 1]]"
  - "[[Supporting Study 2]]"
  - "[[Contradicting Study]]"
tags:
  - research
  - published
---
```

## Tips for Success

1. **Use consistent property names** - Stick with the default `Parent`, `Child`, `Related` or customize them in settings
2. **Let the plugin do the work** - Only set relationships in one direction, the plugin handles the rest
3. **Use wiki links** - Always use `[[note name]]` format for relationships
4. **Enable auto-link siblings** - Makes sense for most hierarchies
5. **Configure directory scanning** - Focus on specific folders if you have a large vault

Happy networking! 🚀
