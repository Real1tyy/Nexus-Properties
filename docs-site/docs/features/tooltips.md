---
sidebar_position: 8
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Tooltips

Hover over nodes to see frontmatter properties instantly.

![Node Tooltips](/img/screenshots/tooltips.png)

*Hover tooltip showing configured properties*

## Usage

**Show**: Hover over node for 1 second

**Hide**: Move mouse away

**Toggle**: Settings → Show node tooltips, or assign hotkey to "Toggle Tooltips"

**Disabled in zoom mode**: Prevents overlap with zoom preview

## Content

**Displays**:
- Node title (file name)
- Properties configured in [Display Properties in Nodes](../configuration#graph-display) setting
- Wiki links (clickable)
- Arrays (formatted as lists)
- Objects (nested display)

**Respects**: [Property display settings](../configuration#property-display)
- Hide empty properties
- Hide underscore properties

## Clickable Links

**Wiki links**: Navigate to linked node, tooltip updates

**External links**: Open in browser

**Tip**: Chain-navigate through multiple tooltips without clicking nodes!

## Configuration

Tooltip width and property display settings are configured in [Settings](../configuration#property-display).

## Positioning

Auto-positions to stay visible:
- Default: Above and right of node
- Flips to left if near right edge
- Flips below if near top edge

## Next Steps

- [Zoom Mode](zoom-mode) — Full inline preview (alternative to tooltips)
- [Context Menus](context-menus) — Right-click actions
- [Color Rules](color-rules) — Visual categories
- [Configuration](../configuration#property-display) — Tooltip width and property visibility
