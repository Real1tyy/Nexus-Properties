---
sidebar_position: 2
---

# Bidirectional Sync

Automatically manages bidirectional relationships. Set a relationship in one direction, the reverse is created automatically.

## How It Works

**Parent-Child**:
```yaml
# parent.md
Child: ["[[child]]"]

# child.md (auto-updated)
Parent: "[[parent]]"
```

**Related**:
```yaml
# note-1.md
Related: ["[[note-2]]"]

# note-2.md (auto-updated)
Related: ["[[note-1]]"]
```

## Relationship Types

**Parent**: Single value, bidirectional with Child
**Child**: Array (multiple values), bidirectional with Parent
**Related**: Array (multiple values), bidirectional with Related (self)

## Recursive Relationships

**All Parents**: Shows all ancestors, not just immediate parent
**All Children**: Shows all descendants, not just direct children
**All Related (Constellations)**: Shows all notes connected through `Related` recursively

**Recursion depth**: Controlled by [All Related Max Depth](../configuration#all-related-recursion-depth)

## Auto-Link Siblings

**Setting**: [autoLinkSiblings](../configuration#auto-link-siblings) (default: `true`)

When enabled, notes sharing the same parent are automatically marked as related to each other.

**Example**:
```yaml
# Project.md
Child: ["[[Task 1]]", "[[Task 2]]"]

# Task 1.md (with auto-link)
Parent: "[[Project]]"
Related: ["[[Task 2]]"]

# Task 2.md (with auto-link)
Parent: "[[Project]]"
Related: ["[[Task 1]]"]
```

**When to use**: Enable for cross-referencing siblings, disable for strict hierarchies

## Automatic Maintenance

**File deletion**: All references removed from other notes
**File rename**: All references updated automatically
**Relationship removal**: Reverse relationship removed automatically

## Best Practices

1. **Choose one direction**: Set relationships in parent notes, let plugin sync
2. **Use wiki links**: Always use `[[note name]]` format
3. **Consistent property names**: Stick with defaults or customize once
4. **Let plugin work**: Don't manually sync relationships
5. **Rescan if needed**: Settings → "Index and assign properties to all files"

## Common Patterns

**Project management**:
```yaml
# Project.md
Child: ["[[Sprint 1]]", "[[Sprint 2]]"]

# Sprint 1.md
Parent: "[[Project]]"
Child: ["[[Task 1]]", "[[Task 2]]"]
```

**Knowledge hierarchy**:
```yaml
# Mathematics.md
Child: ["[[Algebra]]", "[[Geometry]]"]

# Algebra.md
Parent: "[[Mathematics]]"
Child: ["[[Linear Algebra]]", "[[Abstract Algebra]]"]
```

**Cross-referenced network**:
```yaml
# Concept A.md
Related: ["[[Concept B]]", "[[Concept C]]"]

# Concept B.md
Related: ["[[Concept A]]", "[[Concept D]]"]
```

## Next Steps

- [Graph Views](graph-views) - Visualize relationships
- [Node Creation](node-creation) - Build hierarchies quickly
- [Configuration](../configuration#direct-relationship-properties) - Property names
