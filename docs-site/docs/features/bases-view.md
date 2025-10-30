# Bases View

The Bases View provides a focused, file-centric perspective of your knowledge graph by displaying the relationships of the currently active note. It shows three key relationship categories: Children, Parent, and Related nodes.

## Overview

Unlike the graph view which shows a visual network of all relationships, the Bases View presents a **list-based interface** that focuses exclusively on the relationships of your current note. This makes it ideal for:

- Quickly reviewing what notes are connected to your current note
- Understanding the hierarchical structure around a specific note
- Navigating to related notes without visual clutter
- Working with note relationships in a linear, organized format

## How It Works

The Bases View automatically reads the frontmatter properties of your active note and displays connected notes in three sections:

1. **Children**: Notes where the current note appears in their `Child` property
2. **Parent**: Notes where the current note appears in their `Parent` property
3. **Related**: Notes where the current note appears in their `Related` property

### Automatic Filtering

The Bases View **automatically filters out archived notes**. Any note with `_Archived: true` in its frontmatter will be excluded from all three sections, keeping your view clean and focused on active content.

## Using the Bases View

### Switching Between Views

1. Open the Nexus Properties sidebar panel
2. Click the **"Switch to Bases View"** button at the top of the panel
3. The view will switch to show the Bases View for your currently active note
4. Click **"Switch to Graph View"** to return to the graph visualization

### Navigating Relationships

Each relationship section displays a list of clickable note links:

- **Click any note name** to open that note in your workspace
- Notes are displayed with their basenames (without the `.md` extension)
- Hover over a note to see visual feedback (highlight effect)

## Configuration

The Bases View respects your global Nexus Properties settings:

- **Property Names**: Uses the configured property names for Parent, Child, and Related (default: `Parent`, `Child`, `Related`)
- **Directories**: Only shows notes from your configured scanning directories
- **Archived Filter**: Automatically excludes notes marked with `_Archived: true`

Configure these in **Settings → Nexus Properties**.

## Comparison with Graph View

| Feature | Bases View | Graph View |
|---------|-----------|------------|
| **Focus** | Single note relationships | Network of all relationships |
| **Format** | List-based | Visual graph |
| **Best For** | Quick navigation, focused review | Understanding overall structure |
| **Interaction** | Click to navigate | Drag, zoom, filter |
| **Complexity** | Simple, linear | Rich, visual |

Use **Bases View** when you want to focus on a single note's connections. Use **Graph View** when you want to explore the broader knowledge network.

## Tips

1. **Quick Navigation**: Use Bases View as a fast "relationship navigator" while you're working on a note
2. **Review Context**: Before working on a note, switch to Bases View to see what it's connected to
3. **Find Gaps**: Empty sections help you identify where relationships might be missing
4. **Combine with Graph**: Use Graph View to explore, then switch to Bases View for focused work
