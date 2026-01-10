---
sidebar_position: 1
---

# Features Overview

## Core Features

### 🔗 [Bidirectional Sync](bidirectional-sync)
Set relationships in one direction, plugin syncs the reverse automatically. Optional sibling auto-linking.

### 📊 [Graph Views](graph-views)
Visualize relationships with **Hierarchical** (trees), **Related** (direct connections), and **All Related** (constellations) modes.

### 📝 [Bases View](bases-view)
List-based view of current note's relationships. Shows children, parent, and related notes with custom sorting.

### 🎨 [Color Rules](color-rules)
Apply conditional colors using JavaScript expressions. First matching rule wins.

### 🔍 [Filtering](filtering)
JavaScript expression-based filtering with named presets. Multi-expression AND logic.

### 🔬 [Zoom Mode](zoom-mode)
Click nodes to preview frontmatter and content inline. Navigate with arrow keys or by clicking links.

### 🎯 [Context Menus](context-menus)
Right-click nodes/edges for quick actions: open, add relationships, edit, preview, copy path.

### 💬 [Tooltips](tooltips)
Hover nodes to see properties. Clickable wiki links, configurable width.

### 🔎 Search
Real-time search by filename/path. Highlights matches, dims non-matches. Command: "Toggle Graph Search"

**Searches**: File names and paths (case-insensitive, partial matching)

**Does NOT search**: Frontmatter properties (use [Filtering](filtering)), note content, or tags

![Graph Search](/img/screenshots/graph-search.png)
*Real-time search highlighting*

### 📊 Node Statistics
View real-time relationship counts for the active file in the view switcher header. See direct relationships (Parents, Children, Related) and recursive totals (All Parents, All Children, All Related) at a glance. Both displays are independently configurable in settings.

### ⚡ [Node Creation](node-creation)
Create parent/child/related nodes with property inheritance and bidirectional linking.

### 🗂️ [Node Layout](node-layout)
Automatic positioning: Dagre for hierarchies, constellation for networks. Collision detection included.

### ⚙️ [Property Exclusion](excluded-properties)
Control which properties copy to new nodes. Default and path-based rules.

## Quick Start

1. [Bidirectional Sync](bidirectional-sync) - Understand relationship management
2. [Graph Views](graph-views) - Explore visualization modes
3. [Hotkeys](../hotkeys) - Set up keyboard shortcuts
4. [Color Rules](color-rules) - Add visual categories
5. [Filtering](filtering) - Focus on subsets
6. [Configuration](../configuration) - Customize settings
