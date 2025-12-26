---
sidebar_position: 8
---

# Tooltips

Hover over nodes to see frontmatter properties instantly.

## Usage

**Show**: Hover over node for 1 second
**Hide**: Move mouse away
**Toggle**: Settings → Show node tooltips, or assign hotkey to "Toggle Tooltips"

**Disabled in zoom mode**: Prevents overlap with zoom preview

## Content

**Displays**:
- Node title (file name)
- All frontmatter properties (key-value pairs)
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

**Tooltip width**: [Settings](../configuration#tooltip-width) (150-500px, default 255px)

**Property display**: [Settings](../configuration#property-display)
- Hide empty properties
- Hide underscore properties

## Positioning

Auto-positions to stay visible:
- Default: Above and right of node
- Flips to left if near right edge
- Flips below if near top edge

## Next Steps

- [Zoom Mode](zoom-mode) - Detailed previews
- [Context Menus](context-menus) - Quick actions
- [Color Rules](color-rules) - Visual categories
