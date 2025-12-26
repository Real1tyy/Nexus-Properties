---
sidebar_position: 11
---

# Quick Node Creation

Create parent, child, or related nodes instantly from the command palette. New nodes automatically inherit properties, establish bidirectional relationships, and open for editing - all in one command.

## Available Commands

### Create Parent Node

**Command**: "Nexus Properties: Create Parent Node"

**What it does**:
1. Creates a new file in the same folder as current file
2. Inherits frontmatter properties (except excluded)
3. Sets new file as parent of current file
4. Sets current file as child of new file (bidirectional)
5. Generates unique Zettel ID
6. Opens new file for editing

**When to use**:
- Creating a container/project for the current note
- Building hierarchies bottom-up
- Grouping related notes under a parent

**Availability**: Only available when viewing a file in an indexed directory

### Create Child Node

**Command**: "Nexus Properties: Create Child Node"

**What it does**:
1. Creates a new file in the same folder as current file
2. Inherits frontmatter properties (except excluded)
3. Sets new file as child of current file
4. Sets current file as parent of new file (bidirectional)
5. Generates unique Zettel ID
6. Opens new file for editing

**When to use**:
- Breaking down a note into smaller parts
- Creating tasks for a project
- Building hierarchies top-down
- Adding sub-concepts to a concept

**Availability**: Only available when viewing a file in an indexed directory

### Create Related Node

**Command**: "Nexus Properties: Create Related Node"

**What it does**:
1. Creates a new file in the same folder as current file
2. Inherits frontmatter properties (except excluded)
3. Marks new file as related to current file
4. Marks current file as related to new file (bidirectional)
5. Generates unique Zettel ID
6. Opens new file for editing

**When to use**:
- Creating companion notes
- Adding related concepts
- Expanding a constellation
- Building lateral knowledge networks

**Availability**: Only available when viewing a file in an indexed directory

## How Node Creation Works

### Property Inheritance

New nodes inherit frontmatter from the source file, except for **excluded properties**.

**Example source file** (`project.md`):
```yaml
---
type: project
status: active
priority: high
tags:
  - work
  - important
_ZettelID: 20240115120000
---
```

**New child node** (`project-child.md`):
```yaml
---
type: project
status: active
priority: high
tags:
  - work
  - important
Parent: "[[project]]"
_ZettelID: 20240125130000
---
```

Notice:
- All properties inherited
- Old `_ZettelID` **not copied** (excluded by default)
- New `_ZettelID` generated
- `Parent` relationship added automatically

[Learn more about property exclusion →](excluded-properties)

### Automatic Relationships

Relationships are established bidirectionally:

**For "Create Child"**:
- New file gets `Parent: "[[source-file]]"`
- Source file gets `[[new-file]]` added to `Child` array

**For "Create Parent"**:
- New file gets `Child: ["[[source-file]]"]`
- Source file gets `Parent: "[[new-file]]"`

**For "Create Related"**:
- New file gets `Related: ["[[source-file]]"]`
- Source file gets `[[new-file]]` added to `Related` array

### Zettel ID Generation

Each new node gets a unique timestamp-based ID.

**Format**: `YYYYMMDDHHmmss`

**Example**: `20240125143022` (January 25, 2024, 14:30:22)

**Property name**: Configured in [settings](../configuration#zettel-id-property) (default: `_ZettelID`)

**Purpose**:
- Unique identifier for each note
- Track creation time
- Link notes by ID (alternative to filename)
- Support for Zettelkasten workflows

:::tip Disable Zettel ID
Set the Zettel ID property name to empty string in settings to disable automatic ID generation.
:::

### File Naming

New files are named: `[source-name] - .md`

**Examples**:
- Source: `Project Overview.md`
- New child: `Project Overview - .md`
- Next child: `Project Overview - 1.md` (if first name exists)

**Dash separator**: Uses a dash (` - `) to separate the parent name from the new node name, making it easy to continue typing.

**Auto-increment**: Numbers are appended if a file with the same name already exists.

**Automatic focus**: The inline title input is automatically focused after creation, with the cursor positioned at the end, so you can immediately start typing the node name without clicking.

### File Location

New nodes are created in the **same folder** as the source file.

**Example**:
- Source: `Projects/Work/Main Project.md`
- New child: `Projects/Work/Main Project-untitled-1.md`

**Why?**
- Keep related notes together
- Maintain folder structure
- Easy to find and organize

## Excluded Properties

Certain properties are **not copied** to new nodes.

### Default Excluded Properties

**Default exclusions** (always excluded):
- `Parent`
- `Child`
- `Related`
- `_ZettelID`

**Why?**
- **Relationship properties**: Would create incorrect links
- **Zettel ID**: Each note needs unique ID

[Configure defaults →](../configuration#default-excluded-properties)

### Path-Based Exclusion

Additional properties can be excluded for files in specific directories.

**Example rule**:
- **Path**: `Projects/`
- **Excluded**: `status, progress, deadline`

**Result**: Notes created in `Projects/` folder won't inherit status, progress, or deadline.

[Learn more →](excluded-properties)

## Workflow Examples

### Bottom-Up Hierarchy

**Scenario**: You have a task and want to create a project for it

1. Open `Task 1.md`
2. Command: "Create Parent Node"
3. Rename to `Main Project.md`
4. Add project details

**Result**: Task now has a parent project

### Top-Down Breakdown

**Scenario**: Break a project into tasks

1. Open `Main Project.md`
2. Command: "Create Child Node" (repeat for each task)
3. Rename: `Task 1.md`, `Task 2.md`, etc.
4. Add task details

**Result**: Project has child tasks

### Building a Constellation

**Scenario**: Create related concept notes

1. Open `Concept A.md`
2. Command: "Create Related Node"
3. Rename to `Concept B.md`
4. Repeat from `Concept B` to create `Concept C`
5. All concepts are related through the chain

**Result**: Constellation of related concepts

### Rapid Note Creation

**Scenario**: Brainstorming session - quickly create many related notes

1. Start with seed note
2. Use "Create Related Node" repeatedly
3. Rename each to concept name
4. Add brief notes
5. Constellation grows organically

**Result**: Network of interconnected ideas

## Customization

### Zettel ID Property Name

Change the property name for Zettel IDs:

1. Settings → Nexus Properties → Node creation shortcuts
2. Find "Zettel ID property"
3. Change from `_ZettelID` to your preferred name
4. Or set to empty string to disable

[Configure →](../configuration#zettel-id-property)

### Excluded Properties

Control which properties are copied:

1. Settings → Nexus Properties → Excluded properties
2. Edit "Default excluded properties"
3. Add/remove properties as needed

**Example**: Exclude `date, modified, created` for all notes

[Configure →](../configuration#excluded-properties)

### Path-Based Exclusion

Exclude different properties for different folders:

1. Settings → Nexus Properties → Excluded properties
2. Click "Add Rule"
3. Set path (e.g., `Daily Notes/`)
4. Set excluded properties (e.g., `date, weekday`)

**Result**: Daily notes won't inherit date properties

[Learn more →](excluded-properties)

## Hotkey Recommendations

Assign hotkeys for quick access:

**Suggested hotkeys**:
- `Ctrl+Shift+P` - Create Parent Node
- `Ctrl+Shift+C` - Create Child Node
- `Ctrl+Shift+R` - Create Related Node

**To assign**:
1. Settings → Hotkeys
2. Search "Nexus Properties"
3. Click + button next to command
4. Press desired key combination

## Use Cases

### Project Management

**Create project structure**:
1. Create `Project Overview.md`
2. Use "Create Child" repeatedly for phases
3. From each phase, create tasks

**Result**: Hierarchical project breakdown

### Zettelkasten

**Build knowledge network**:
1. Create literature note
2. Use "Create Related" for permanent notes
3. Link concepts bidirectionally

**Result**: Interconnected knowledge graph

### Research Organization

**Structure research**:
1. Create main research note
2. Use "Create Child" for sub-topics
3. Use "Create Related" for cross-cutting themes

**Result**: Research hierarchy with lateral connections

### Meeting Notes

**From meeting note**:
1. Create `Meeting 2024-01-15.md`
2. Use "Create Child" for action items
3. Each action gets its own note

**Result**: Trackable action items linked to meeting

## Troubleshooting

### Command Not Available

**Check current file**:
- Must be viewing a file (not graph view)
- File must be in indexed directory
- Check [directory settings](../configuration#directory-scanning)

**Check plugin enabled**:
- Nexus Properties must be active
- Try reloading plugin

### Properties Not Inherited

**Check excluded properties**:
- Property might be in exclusion list
- Check [default exclusions](../configuration#default-excluded-properties)
- Check [path-based rules](excluded-properties)

**Check property exists**:
- Verify property in source file's frontmatter
- Check spelling and capitalization

### Relationship Not Created

**Check bidirectional sync**:
- Both files should update
- Check frontmatter of both files
- Run rescan if needed: Settings → Rescan Everything

**Check file created**:
- New file should exist in same folder
- Check folder for new file

### Zettel ID Not Generated

**Check setting**:
- Zettel ID property must be set
- Default: `_ZettelID`
- If empty, IDs aren't generated

**Check not excluded**:
- Zettel ID property is auto-excluded (correct behavior)
- New ID is generated, not copied

### File Name Conflicts

**Auto-increment handles it**:
- Numbers increase to avoid conflicts
- `untitled-1`, `untitled-2`, etc.

**Rename immediately**:
- Files open for editing right away
- Give meaningful names quickly

## Tips & Best Practices

1. **Rename immediately** after creation - files open ready for editing
2. **Use hotkeys** for rapid creation
3. **Create many, refine later** - quick capture during brainstorming
4. **Consistent property structure** - inherited properties maintain consistency
5. **Review excluded list** - Ensure right properties are inherited
6. **Path-based rules** for folder-specific behavior
7. **Zettel IDs** for permanent notes, optional for temporary

## Next Steps

- [Configure Excluded Properties](excluded-properties)
- [Learn about Bidirectional Sync](bidirectional-sync)
- [Use Context Menus](context-menus) to add relationships visually
- [Customize Settings](../configuration#node-creation-shortcuts)
