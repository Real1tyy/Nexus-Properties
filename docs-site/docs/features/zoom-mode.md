---
sidebar_position: 7
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Zoom Mode

Preview notes inline by clicking any node in the graph. View frontmatter and content without leaving the visualization.

<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/ZoomNEW.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

*Zoom preview showing frontmatter and content*

## Entering & Exiting

**Enter**: Click any node

**Switch focus**: Click another node while in zoom mode

**Exit**: Click the focused node again, or click outside the graph

**Focus indicator**: Focused node has a thick blue border (3px, `#2563eb`)

## Preview Panel

The preview panel appears at the bottom with two sections:

### Frontmatter Section

- Property key-value pairs
- Clickable wiki links
- Arrays as bulleted lists
- Respects [property display settings](../configuration#property-display)
- Height: [Zoom Preview Frontmatter Height](../configuration#zoom-preview-frontmatter-height) (50-300px, default 90px)

### Content Section

- Rendered markdown
- Clickable links
- Scrollable
- Height: [Zoom Preview Height](../configuration#zoom-preview-height) (120-700px, default 280px)

## Toggling Sections

**Eye icons** in header toggle visibility:
- Left icon: Frontmatter
- Right icon: Content

**Commands**:
- "Toggle Focus Content (Zoom Preview)"
- "Toggle Focus Frontmatter (Zoom Preview)"

**Default visibility**: [Configure in settings](../configuration#zoom-hide-frontmatter-by-default)

**Tip**: [Assign hotkeys](../hotkeys) for quick toggling

## Navigation

### Clicking

**Wiki links**: Navigate to linked node, stay in zoom mode

**Other nodes**: Switch focus instantly

**Edges**: Focus on target node

**External links**: Open in browser

### Keyboard

**Arrow keys**:
- **⬆️ Up**: Navigate to parent
- **⬇️ Down**: Navigate to child
- **⬅️ Left**: Navigate to left node (spatial)
- **➡️ Right**: Navigate to right node (spatial)

**Tree navigation** (hierarchical mode only):
- **⏎ Enter**: Next tree root (wraps around)
- **⇧ Shift+Enter**: Previous tree root (wraps around)

**Quick return to source**:
- **Center on Source Node** command: Returns focus to the original source file in zoom mode
- [Assign a hotkey](../hotkeys) for quick access

## Next Steps

- [Tooltips](tooltips) - Hover-based previews
- [Context Menus](context-menus) - Quick actions
- [Graph Views](graph-views) - View modes
