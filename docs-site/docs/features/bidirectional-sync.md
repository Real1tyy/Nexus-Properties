---
sidebar_position: 2
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Bidirectional Sync

<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/AddRelationship.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

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

**Recursion depth**: Controlled by [All Related Max Depth](../configuration#depth-settings)

## Auto-Link Siblings

**Setting**: [autoLinkSiblings](../configuration#direct-relationship-properties) (default: `true`)

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

## Next Steps

- [Graph Views](graph-views) — Visualize relationships
- [Node Creation](node-creation) — Build hierarchies quickly
- [Configuration](../configuration#direct-relationship-properties) — Customize property names
- [Troubleshooting](../troubleshooting) — Sync issues
