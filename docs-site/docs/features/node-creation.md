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
5. Opens file for editing with cursor at end of inline title

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

**Pattern**: `[source-name] - .md`

**Examples**:
- Source: `Project Overview.md`
- New child: `Project Overview - .md`
- Next child: `Project Overview - 1.md` (auto-increment)

**Auto-focus**: Inline title input automatically focused, cursor at end

## Configuration

**Zettel ID property**: [Settings](../configuration#zettel-id-property) (default: `_ZettelID`, set empty to disable)

**Excluded properties**: [Settings](../configuration#default-excluded-properties) (default: `Parent, Child, Related, _ZettelID`)

**Path-based exclusion**: [Learn more](excluded-properties)

## Workflow Examples

**Bottom-up hierarchy**: Open task → Create Parent → Rename to project
**Top-down breakdown**: Open project → Create Child (repeat) → Rename to tasks
**Constellation building**: Open concept → Create Related → Repeat from new note
**Rapid brainstorming**: Start with seed → Create Related repeatedly

## Hotkey Recommendations

- `Ctrl+Shift+P` - Create Parent Node
- `Ctrl+Shift+C` - Create Child Node
- `Ctrl+Shift+R` - Create Related Node

Assign in Settings → Hotkeys → Nexus Properties

## Next Steps

- [Excluded Properties](excluded-properties) - Control inheritance
- [Bidirectional Sync](bidirectional-sync) - Relationship management
- [Context Menus](context-menus) - Add relationships visually
