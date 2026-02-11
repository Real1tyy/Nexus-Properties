---
sidebar_position: 1
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Features Overview

## Core Features

### [Bidirectional Sync](bidirectional-sync)
Set relationships in one direction, the reverse syncs automatically. Optional [sibling auto-linking](bidirectional-sync#auto-link-siblings).

### [Graph Views](graph-views)
Visualize relationships with **Hierarchical** (trees), **Related** (direct connections), and **All Related** (constellations) modes. Includes [depth control](graph-views#depth-control) and interactive [zoom](zoom-mode).

### [Bases View](bases-view)
List-based view of the current note's relationships with custom sorting, [view types](../configuration#bases-view) (cards, table, list), and [archived filtering](bases-view#archived-toggle).

### [MOC View](moc-view)
Collapsible tree outline with clickable wiki links. Toggle between current file or topmost parent as root. Supports [bullet-list hierarchies](moc-view#moc-content-hierarchy) as an alternative to frontmatter properties.

### [Color Rules](color-rules)
Apply conditional node colors using JavaScript expressions. First matching rule wins.

### [Filtering & Search](filtering)
JavaScript expression-based filtering with named [presets](filtering#filter-presets) and multi-expression AND logic. Real-time [search](filtering#search) by filename/path. [Indirect connections](filtering#indirect-connections) maintain context when nodes are hidden.

### [Zoom Mode](zoom-mode)
Click nodes to preview frontmatter and content inline. Navigate with [arrow keys](zoom-mode#keyboard) or by clicking links.

### [Context Menus](context-menus)
Right-click nodes/edges for quick actions: open, add relationships, edit, preview, delete, copy path.

### [Tooltips](tooltips)
Hover nodes to see properties. Clickable wiki links, [configurable width](../configuration#multi-row-layout).

### Node Statistics
Real-time relationship counts in the view switcher header. Shows direct counts (Parents, Children, Related) and recursive totals (All Parents, All Children, All Related). Both displays are [independently configurable](../configuration#view-switcher-statistics).

### [Node Creation](node-creation)
Create parent/child/related nodes with [property inheritance](node-creation#property-inheritance) and bidirectional linking via a modal interface.

### [Node Layout](node-layout)
Automatic positioning: Dagre for hierarchies, constellation for networks. Optional [multi-row layout](node-layout#multi-row-layout-large-families) for large families. Collision detection included.

### [Property Exclusion](excluded-properties)
Control which properties copy to new nodes. Default and [path-based rules](excluded-properties#path-based-rules).

## Quick Start

1. [Bidirectional Sync](bidirectional-sync) — Understand relationship management
2. [Graph Views](graph-views) — Explore visualization modes
3. [Hotkeys](../hotkeys) — Set up keyboard shortcuts
4. [Color Rules](color-rules) — Add visual categories
5. [Filtering](filtering) — Focus on subsets
6. [Configuration](../configuration) — Customize all settings
