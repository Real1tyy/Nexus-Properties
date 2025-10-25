---
sidebar_position: 2
---

# Bidirectional Relationship Management

Nexus Properties automatically manages bidirectional relationships between your notes. When you set a relationship in one direction, the reverse relationship is automatically created and maintained.

## How It Works

### Parent-Child Relationships

When you add a child reference to a parent note:

```yaml
# parent-note.md
---
Child:
  - "[[child-note]]"
---
```

Nexus Properties automatically updates the child note:

```yaml
# child-note.md
---
Parent: "[[parent-note]]"
---
```

**You only set the relationship once** - the plugin handles the bidirectional sync!

### Related Relationships

The same works for related relationships. When you mark two notes as related:

```yaml
# note-1.md
---
Related:
  - "[[note-2]]"
---
```

The plugin automatically updates the other note:

```yaml
# note-2.md
---
Related:
  - "[[note-1]]"
---
```

Both notes now show they're related to each other.

## Relationship Types

### Parent Property

**Default name**: `Parent`
**Cardinality**: Single value
**Bidirectional with**: `Child`

A note can have zero or one parent. When you set a parent, the parent note automatically gets the child relationship.

**Example hierarchy**:
```
Project
├── Task 1
├── Task 2
└── Task 3
```

```yaml
# Task 1.md
Parent: "[[Project]]"
```

```yaml
# Project.md
Child:
  - "[[Task 1]]"
  - "[[Task 2]]"
  - "[[Task 3]]"
```

### Child Property

**Default name**: `Child`
**Cardinality**: Array (multiple values)
**Bidirectional with**: `Parent`

A note can have zero or many children. When you add children, each child note automatically gets the parent relationship.

### Related Property

**Default name**: `Related`
**Cardinality**: Array (multiple values)
**Bidirectional with**: `Related` (self)

Notes can be related to any number of other notes. Related relationships are symmetrical - if A is related to B, then B is related to A.

**Use cases**:
- Linking similar concepts
- Cross-referencing between topics
- Connecting notes in a network (not hierarchy)

## Recursive Relationships

Nexus Properties computes recursive relationships dynamically:

### All Parents

Shows all ancestors in the hierarchy, not just the immediate parent.

**Example**:
```
Grandparent
└── Parent
    └── Child
```

When viewing `Child` in "All Related" mode, the graph will show:
- Parent (direct parent)
- Grandparent (indirect parent)

### All Children

Shows all descendants in the hierarchy, not just direct children.

**Example**:
```
Project
├── Phase 1
│   ├── Task 1.1
│   └── Task 1.2
└── Phase 2
    ├── Task 2.1
    └── Task 2.2
```

When viewing `Project` in "All Related" mode, the graph will show:
- Phase 1, Phase 2 (direct children)
- Task 1.1, Task 1.2, Task 2.1, Task 2.2 (indirect children)

### All Related (Constellations)

Shows all notes connected through the `Related` property, recursively.

**Example**:
```
Note A ↔ Note B ↔ Note C
         ↓
      Note D ↔ Note E
```

When viewing `Note A` in "All Related" mode with sufficient depth, the graph will show all connected notes:
- Note B (direct related)
- Note C (related to B)
- Note D (related to B)
- Note E (related to D)

The depth of recursion is controlled by the [All Related Max Depth](../configuration#all-related-recursion-depth) setting.

## Auto-Link Siblings

**Setting**: `autoLinkSiblings`
**Default**: `true`

When enabled, notes that share the same parent are automatically marked as related to each other.

**Without auto-link**:
```yaml
# Project.md
Child:
  - "[[Task 1]]"
  - "[[Task 2]]"
```

```yaml
# Task 1.md
Parent: "[[Project]]"
```

```yaml
# Task 2.md
Parent: "[[Project]]"
```

**With auto-link** (enabled by default):
```yaml
# Task 1.md
Parent: "[[Project]]"
Related:
  - "[[Task 2]]"
```

```yaml
# Task 2.md
Parent: "[[Project]]"
Related:
  - "[[Task 1]]"
```

:::tip When to Use
Enable auto-link siblings when:
- Tasks in the same project should be aware of each other
- Siblings in an outline should cross-reference
- Chapters in a book should link together

Disable when:
- Children are independent items
- You want strict hierarchies without lateral connections
- Performance is a concern with many siblings
:::

## Automatic Maintenance

Nexus Properties automatically maintains relationship consistency:

### File Deletion

When you delete a file, all references to it are automatically removed from other notes' frontmatter.

**Before deletion**:
```yaml
# Project.md
Child:
  - "[[Task 1]]"
  - "[[Task 2]]"
```

**After deleting Task 1.md**:
```yaml
# Project.md
Child:
  - "[[Task 2]]"
```

### File Rename

When you rename a file, all references are automatically updated.

**Before rename** (`old-name.md` → `new-name.md`):
```yaml
# Project.md
Child:
  - "[[old-name]]"
```

**After rename**:
```yaml
# Project.md
Child:
  - "[[new-name]]"
```

### Relationship Removal

When you remove a relationship from one side, the reverse relationship is automatically removed.

**Remove child from parent**:
```yaml
# Before (parent-note.md)
Child:
  - "[[child-note]]"
  - "[[other-child]]"

# After removing [[child-note]]
Child:
  - "[[other-child]]"
```

**Automatically updates child-note.md**:
```yaml
# Before
Parent: "[[parent-note]]"

# After (Parent property removed)
---
```

## Best Practices

### 1. Choose Your Direction

Pick one direction to set relationships and let the plugin handle the rest:

✅ **Recommended**: Set relationships in parent notes
```yaml
# Project.md
Child:
  - "[[Task 1]]"
  - "[[Task 2]]"
```

❌ **Not recommended**: Setting both sides manually
```yaml
# Project.md
Child: ["[[Task 1]]"]

# Task 1.md
Parent: "[[Project]]"
```
The plugin does this automatically!

### 2. Use Wiki Links

Always use Obsidian's wiki link format for relationships:

✅ **Correct**:
```yaml
Parent: "[[note name]]"
Child:
  - "[[child 1]]"
  - "[[child 2]]"
```

❌ **Incorrect**:
```yaml
Parent: note name
Child:
  - child 1
  - child 2
```

### 3. Consistent Property Names

Stick with the default property names or customize them once in settings. Don't mix property names across your vault.

### 4. Let the Plugin Work

Don't try to manually sync relationships - the plugin handles it automatically. Just set relationships in one direction and trust the sync.

### 5. Use the Rescan Feature

If relationships ever seem out of sync:
1. Go to Settings → Nexus Properties
2. Click "Index and assign properties to all files"
3. Wait for the rescan to complete

This will rebuild all relationships from scratch.

## Common Patterns

### Project Management

```yaml
# Project.md
---
Child:
  - "[[Sprint 1]]"
  - "[[Sprint 2]]"
status: active
---
```

```yaml
# Sprint 1.md
---
Parent: "[[Project]]"
Child:
  - "[[Task 1]]"
  - "[[Task 2]]"
---
```

### Knowledge Hierarchy

```yaml
# Mathematics.md
---
Child:
  - "[[Algebra]]"
  - "[[Geometry]]"
  - "[[Calculus]]"
---
```

```yaml
# Algebra.md
---
Parent: "[[Mathematics]]"
Child:
  - "[[Linear Algebra]]"
  - "[[Abstract Algebra]]"
---
```

### Cross-Referenced Network

```yaml
# Concept A.md
---
Related:
  - "[[Concept B]]"
  - "[[Concept C]]"
---
```

```yaml
# Concept B.md
---
Related:
  - "[[Concept A]]"
  - "[[Concept D]]"
---
```

All four concepts will show as related in "All Related" mode!

## Troubleshooting

### Relationships Not Syncing

1. **Check property names** - Make sure you're using the correct property names from settings
2. **Check wiki link format** - Must use `[[note name]]` format
3. **Check directory scanning** - File must be in a scanned directory
4. **Run full rescan** - Use "Index and assign properties to all files"

### Orphaned Relationships

If you have relationships pointing to non-existent files:
1. The plugin will show warnings in the console
2. Run a full rescan to clean them up
3. Check for typos in wiki links

### Performance Issues

With large networks (1000+ notes):
1. Limit [recursion depth](../configuration#all-related-recursion-depth)
2. Use [directory scanning](../configuration#directory-scanning) to limit scope
3. Disable [auto-link siblings](../configuration#auto-link-siblings) if not needed

## Next Steps

- [Learn about Graph Views](graph-views) to visualize your relationships
- [Configure property names](../configuration#direct-relationship-properties)
- [Understand Recursive Relationships](graph-views#all-related-mode)
- [Use Node Creation shortcuts](node-creation) to build hierarchies quickly
