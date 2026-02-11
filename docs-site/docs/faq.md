---
sidebar_position: 98
---

# Frequently Asked Questions

## General

### What's the difference between this and Obsidian's built-in graph?

Obsidian's graph shows backlinks between notes. Nexus Properties shows **frontmatter-based relationships** with automatic [bidirectional sync](features/bidirectional-sync), multiple [view modes](features/graph-views), [color rules](features/color-rules), [filtering](features/filtering), and [zoom previews](features/zoom-mode).

### Why use frontmatter relationships instead of backlinks?

- **Explicit structure** — Define clear parent-child hierarchies, not just loose links
- **Bidirectional sync** — Set once, both sides update automatically
- **Typed relationships** — Distinguish between parent, child, and related
- **Queryable** — Filter and search based on relationship properties

---

## Relationships

### How do I break a relationship?

Delete the relationship from one file's frontmatter — the reverse is removed automatically. Or right-click an edge in the graph → "Remove Relationship". See [Context Menus](features/context-menus#edge-context-menu).

### My relationships aren't syncing

1. Check [directory scanning](configuration#directory-scanning) includes both files
2. Verify [property names](configuration#direct-relationship-properties) match your frontmatter
3. Use wiki link format: `"[[note name]]"`
4. Run a [full rescan](configuration#indexing) to rebuild relationships

---

## Graph

### Why isn't my file showing in the graph?

1. File must be in an [indexed directory](configuration#directory-scanning)
2. File needs at least one relationship (`Parent`, `Child`, or `Related`)
3. Check that [filters](features/filtering) aren't hiding it
4. Ensure the [view mode](features/graph-views#view-modes) matches your relationship type

### My color rule isn't working

1. Check [expression syntax](features/color-rules#example-rules) — must be valid JavaScript
2. Property names are case-sensitive
3. Verify the rule is enabled and check [rule order](features/color-rules#rule-order) (first match wins)
4. Confirm the property exists in frontmatter (use [tooltips](features/tooltips) to verify)

---

## Node Creation

### Where are new nodes created?

In the **same folder** as the source file. See [Node Creation](features/node-creation) for details.

### What is a Zettel ID?

A unique timestamp identifier (`YYYYMMDDHHmmss`) assigned to each new node. Configured in [Settings](configuration#node-creation-shortcuts).

---

## Get Help

- [Troubleshooting Guide](troubleshooting) — Common issues and solutions
- [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions) — Community Q&A
- [Report a Bug](https://github.com/Real1tyy/Nexus-Properties/issues) — File an issue
