---
sidebar_position: 10
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Context Menus

Right-click nodes or edges for quick actions.

![Node Context Menu](/img/screenshots/node-context-menu.png)

*Node context menu with quick actions*

## Node Context Menu

**Open File**: Opens in current tab

**Open in New Tab**: Opens in new tab (or double-click node)

**Add Parent/Child/Related**: Activates relationship adder mode

<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/RelationshipDiagram.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

**Render as Root**: Removes all parent nodes above the selected node, making it the new root of the hierarchy
<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/RenderAsRoot.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

**Preview**: Opens read-only preview modal (alternative: [Zoom Mode](zoom-mode))
<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/PreviewNode.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

**Edit**: Opens frontmatter editor modal for quick property editing
<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/EditButton.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

**Delete**: Moves file to trash (can be undone with undo)
<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/UndoRedoNEW.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

## Edge Context Menu

**Remove Relationship**: Removes relationship from both nodes' frontmatter

**Navigate to Source**: Focuses on source node

**Navigate to Target**: Focuses on target node

![Edge Context Menu](/img/screenshots/edge-context-menu.png)
*Edge context menu for relationship management*

## Relationship Adder

**Activate**: Right-click node → "Add Parent/Child/Related"

**Select target**: Click another node to create relationship

**Cancel**: Press Escape, right-click anywhere, or click outside graph

**Visual feedback**: Status bar shows current mode

**Validation**: Prevents circular relationships and duplicates

:::tip Undo Support
All destructive operations (delete node, remove relationship) can be undone. See [Hotkeys](../hotkeys#undoredo) for details.
:::

## Next Steps

- [Node Creation](node-creation) — Create nodes via commands
- [Zoom Mode](zoom-mode) — Inline preview (alternative to Preview action)
- [Bidirectional Sync](bidirectional-sync) — How relationships are managed
- [Hotkeys](../hotkeys#undoredo) — Undo/redo keyboard shortcuts
- [Mobile Support](../mobile#touch-interactions) — Long-press for context menus on mobile
