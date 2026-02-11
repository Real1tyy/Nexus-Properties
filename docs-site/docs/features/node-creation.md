---
sidebar_position: 11
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Node Creation
<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/CreateChildNEW.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

Create parent, child, or related nodes instantly from commands using a clean modal interface. New nodes inherit properties, establish bidirectional relationships, and open for editing.

<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/CreateRelatedNEW.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

## Commands

**Create Parent Node**: Opens modal to name parent, creates it with bidirectional relationship

**Create Child Node**: Opens modal to name child, creates it with bidirectional relationship

**Create Related Node**: Opens modal to name related node, creates it with bidirectional relationship

**Availability**: Only when viewing a file in an indexed directory

## How It Works

1. **Modal appears** with pre-filled naming pattern
2. **Type the name** (cursor positioned optimally for each node type)
3. **Press Enter** to create or **Escape** to cancel
4. **File is created** in same folder as current file
5. **Inherits frontmatter** (except [excluded properties](excluded-properties))
6. **Sets bidirectional relationship** automatically
7. **Generates unique Zettel ID** (if configured)
8. **Opens file** for editing

## Property Inheritance

**Inherited**: All frontmatter properties except excluded ones

**Excluded by default**:
- `Parent`, `Child`, `Related` (relationship properties)
- `_ZettelID` (each note needs unique ID)

**New Zettel ID**: Generated in format `YYYYMMDDHHmmss` (e.g., `20240125143022`)

[Learn more about exclusion →](excluded-properties)

## Automatic Relationships

**Create Child**:
- New file: `Parent: "[[source-file]]"`
- Source file: Adds to `Child` array

**Create Parent**:
- New file: `Child: ["[[source-file]]"]`
- Source file: Sets `Parent: "[[new-file]]"`

**Create Related**:
- New file: `Related: ["[[source-file]]"]`
- Source file: Adds to `Related` array

## Modal Interface

**Clean Dialog**: A centered modal dialog appears when you trigger any node creation command.

**Pre-filled Naming**: The input field is pre-filled with an intelligent pattern based on the node type you're creating.

**Keyboard Shortcuts**:
- **Enter**: Create the node with the entered name
- **Escape**: Cancel and close the modal

### Create Child Node
- **Pre-filled**: `Project Overview - `
- **Cursor**: Positioned at the **end** (ready to type child name)
- **You type**: `Implementation Plan`
- **Result**: `Project Overview - Implementation Plan.md`

### Create Parent Node
- **Pre-filled**: ` - Task List`
- **Cursor**: Positioned at the **beginning** (ready to type parent name)
- **You type**: `Q1 Goals`
- **Result**: `Q1 Goals - Task List.md`

### Create Related Node
- **Pre-filled**: `Meeting Notes `
- **Cursor**: Positioned at the **end** (ready to type related name)
- **You type**: `Action Items`
- **Result**: `Meeting Notes Action Items.md`

**Duplicate Handling**: If a file with the same name exists, a number is automatically appended (`Name 1.md`, `Name 2.md`, etc.)

## Configuration

**Zettel ID property**: [Settings](../configuration#zettel-id-property) (default: `_ZettelID`, set empty to disable)

**Excluded properties**: [Settings](../configuration#default-excluded-properties) (default: `Parent, Child, Related, _ZettelID`)

**Path-based exclusion**: [Learn more](excluded-properties)

## Next Steps

- [Excluded Properties](excluded-properties) - Control inheritance
- [Bidirectional Sync](bidirectional-sync) - Relationship management
- [Context Menus](context-menus) - Add relationships visually
