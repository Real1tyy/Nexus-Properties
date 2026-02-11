---
sidebar_position: 3
---

# Hotkeys

All Nexus Properties commands support custom hotkey assignment. Assign hotkeys in **Settings → Hotkeys → Search "Nexus Properties"**.

## Available Commands

### View Management

| Command | Description |
|---------|-------------|
| **Show Relationship Graph** | Open/toggle the relationship graph view |
| **Toggle View Mode** | Cycle between Graph, [Bases](features/bases-view), and [MOC](features/moc-view) views |
| **Enlarge Graph** | Toggle enlarged graph view (uses [configured width](configuration#graph-display)) |

### Graph Navigation

| Command | Description |
|---------|-------------|
| **Toggle Graph Search** | Show/hide search bar for finding nodes by name/path |
| **Toggle Graph Filter (Expression Input)** | Show/hide [filter input](features/filtering) for JavaScript expressions |
| **Toggle Graph Filter (Preset Selector)** | Show/hide [preset dropdown](features/filtering#filter-presets) for saved filters |
| **Center on Source Node** | Re-center graph on source node (or switch zoom focus to source if in [zoom mode](features/zoom-mode)) |

### Zoom Mode

| Command | Description |
|---------|-------------|
| **Toggle Focus Content (Zoom Preview)** | Show/hide content section in [zoom preview](features/zoom-mode) |
| **Toggle Focus Frontmatter (Zoom Preview)** | Show/hide frontmatter section in zoom preview |

:::note
Zoom commands only work when graph view is open and zoom mode is active.
:::

### Node Creation

| Command | Description |
|---------|-------------|
| **Create Parent Node** | Create new parent with [bidirectional relationship](features/bidirectional-sync) |
| **Create Child Node** | Create new child with bidirectional relationship |
| **Create Related Node** | Create new related node with bidirectional relationship |

:::note
Node creation commands are only available when viewing a file in an [indexed directory](configuration#directory-scanning).
:::

### Bases View Navigation

| Command | Description |
|---------|-------------|
| **Bases: Next View** | Cycle forward through view options (Children → Parent → Related → All Children → etc.) |
| **Bases: Previous View** | Cycle backward through view options |

:::tip
Right-click the view dropdown to quickly cycle to the next view without hotkeys.
:::

### Undo/Redo

| Command | Description |
|---------|-------------|
| **Undo** | Undo the last graph operation (add/remove relationship, create/delete/edit node) |
| **Redo** | Redo the last undone operation |

:::note
History stores up to 50 operations. Performing a new action clears the redo stack.
:::

## Next Steps

- [Features Overview](features/overview) — What each command does in detail
- [Graph Views](features/graph-views) — Graph navigation and interaction
- [Node Creation](features/node-creation) — Node creation workflow
- [Context Menus](features/context-menus) — Quick actions via right-click
- [Configuration](configuration) — All settings reference
