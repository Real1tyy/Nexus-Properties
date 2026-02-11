---
sidebar_position: 3
---

# Quick Start Guide

Get up and running with Nexus Properties in 5 minutes.

## Step 1: Open the Relationship Graph

- **Ribbon icon**: Click the fork icon in the left sidebar (enable in Settings → Nexus Properties → Show Ribbon Icon)
- **Command palette**: `Ctrl/Cmd+P` → "Show Relationship Graph"

The graph view opens in the sidebar. For full details on graph interaction, see [Graph Views](features/graph-views).

## Step 2: Review Default Settings

Open **Settings → Nexus Properties** and check:

- **Property names** — Defaults are `Parent`, `Child`, `Related`. Change if your vault already uses different keys.
- **Directory scanning** — Defaults to `["*"]` (entire vault). Restrict to specific folders if needed.

See [Configuration](configuration) for all settings.

## Step 3: Create Your First Hierarchy

Create a note called `Project Overview.md` (it can be empty). Then use the **Create Child** command to build your hierarchy:

1. Open `Project Overview.md`
2. `Ctrl/Cmd+P` → **"Create Child Node"**
3. A modal appears with the name pre-filled as `Project Overview - `
4. Type `Task 1` and press **Enter**

The new `Project Overview - Task 1.md` file is created with:
- `Parent: "[[Project Overview]]"` set automatically
- All frontmatter properties inherited from the parent
- A bidirectional relationship — `Project Overview.md` now has `Child: ["[[Project Overview - Task 1]]"]`

Repeat to create `Task 2`. You now have a parent with two children, all linked automatically.

See [Node Creation](features/node-creation) for all creation commands and naming patterns.

## Step 4: See Bidirectional Sync

Open any child note and check its frontmatter — `Parent` was set automatically. Open the parent and `Child` was updated too.

This works for all relationship types. Try adding a `Related` property manually:

```yaml
---
Related:
  - "[[Project Overview - Task 2]]"
---
```

Check `Task 2` — it now has `Related: ["[[Project Overview - Task 1]]"]` automatically. See [Bidirectional Sync](features/bidirectional-sync) for details.

## Step 5: Explore the Views

Use the toggle button to switch between views:

- **Graph View** — Interactive visualization with [Hierarchical, Related, and All Related modes](features/graph-views)
- **Bases View** — [List-based view](features/bases-view) with custom sorting
- **MOC View** — [Collapsible tree outline](features/moc-view) with clickable links

## Step 6: Interact with the Graph

- **Click a node** → Enter [Zoom Mode](features/zoom-mode) to preview content inline
- **Right-click a node** → Open the [Context Menu](features/context-menus) for quick actions (add relationships, edit, preview, delete)
- **Hover a node** → See [Tooltips](features/tooltips) with frontmatter properties

## Step 7: Add Color Rules

1. Settings → Nexus Properties → Node Colors → **Add Rule**
2. Expression: `status === 'complete'` → Color: green
3. Add `status: complete` to a note's frontmatter — the node changes color

See [Color Rules](features/color-rules) for expression syntax and examples.

## Step 8: Filter the Graph

1. `Ctrl/Cmd+P` → "Toggle Graph Filter"
2. Enter: `status === 'pending'`
3. Only matching nodes are shown (source node always visible)

See [Filtering](features/filtering) for multi-expression filters, presets, and search.

## Step 9: MOC Content Mode

If you have notes with bullet-list hierarchies (Map of Content files), switch to MOC Content mode:

```markdown
# My Hobbies

- [[Reading]]
    - [[Fiction]]
    - [[Non-Fiction]]
- [[Sports]]
    - [[Running]]
    - [[Swimming]]
```

Enable in Settings → General → Hierarchy Source → **MOC Content**, or use the toggle button that appears when viewing a valid MOC file. See [MOC View](features/moc-view#moc-content-hierarchy) for details.

## Next Steps

- [Features Overview](features/overview) — Summary of all features
- [Configuration](configuration) — All settings reference
- [Hotkeys](hotkeys) — Keyboard shortcuts
- [Video Tutorials](videos) — Visual walkthroughs
- [Mobile Support](mobile) — Touch-optimized experience
