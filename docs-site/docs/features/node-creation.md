---
sidebar_position: 11
---

# Node Creation

Create parent, child, or related nodes instantly from commands. New nodes inherit properties, establish bidirectional relationships, and open for editing.

## Commands

**Create Parent Node**: Creates parent, sets bidirectional relationship

**Create Child Node**: Creates child, sets bidirectional relationship

**Create Related Node**: Creates related, sets bidirectional relationship

**Availability**: Only when viewing a file in an indexed directory

## How It Works

1. Creates new file in same folder as current file
2. Inherits frontmatter (except [excluded properties](excluded-properties))
3. Sets bidirectional relationship
4. Generates unique Zettel ID (if configured)
5. Opens file for editing with cursor intelligently positioned based on node type

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

## File Naming

**Smart Naming Patterns**: Each node type uses an optimized naming pattern and cursor position for efficient workflow.

### Create Child Node
- **Pattern**: `[source-name] - .md`
- **Example**: `Project Overview.md` → `Project Overview - .md`
- **Cursor**: Positioned at the **end** (after the dash) to type the child name
- **Auto-increment**: `Project Overview - 1.md`, `Project Overview - 2.md`, etc.

### Create Parent Node
- **Pattern**: ` - [source-name].md`
- **Example**: `Task List.md` → ` - Task List.md`
- **Cursor**: Positioned at the **very beginning** (before the dash) to type the parent name
- **Auto-increment**: `1 - Task List.md`, `2 - Task List.md`, etc.

### Create Related Node
- **Pattern**: `[source-name] .md`
- **Example**: `Meeting Notes.md` → `Meeting Notes .md`
- **Cursor**: Positioned at the **end** (after the space) to type the related name
- **Auto-increment**: `Meeting Notes  1.md`, `Meeting Notes  2.md`, etc.

**Fast Focus**: Inline title is automatically focused

## Configuration

**Zettel ID property**: [Settings](../configuration#zettel-id-property) (default: `_ZettelID`, set empty to disable)

**Excluded properties**: [Settings](../configuration#default-excluded-properties) (default: `Parent, Child, Related, _ZettelID`)

**Path-based exclusion**: [Learn more](excluded-properties)

## Next Steps

- [Excluded Properties](excluded-properties) - Control inheritance
- [Bidirectional Sync](bidirectional-sync) - Relationship management
- [Context Menus](context-menus) - Add relationships visually
