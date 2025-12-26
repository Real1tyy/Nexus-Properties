---
sidebar_position: 98
---

# Frequently Asked Questions

Core questions about Nexus Properties functionality.

## General

### What is Nexus Properties?

Nexus Properties is an Obsidian plugin that automatically manages bidirectional relationships (parent-child, related) and provides an interactive relationship graph to visualize and navigate your knowledge network.

### What's the difference between this and Obsidian's built-in graph?

Obsidian's graph shows backlinks. Nexus Properties shows **frontmatter-based relationships** with automatic bidirectional sync, multiple view modes, color rules, filtering, and zoom previews.

### Why use frontmatter relationships instead of backlinks?

- **Explicit structure**: Define clear parent-child hierarchies
- **Bidirectional sync**: Set once, updates both sides automatically
- **Typed relationships**: Distinguish between parent, child, and related
- **Queryable**: Filter and search based on relationship properties

---

## Relationships

### How do I break a relationship?

Delete the relationship from one file's frontmatter - the plugin automatically removes it from the other file. Or use context menu: Right-click edge → "Remove Relationship"

### My relationships aren't syncing. What's wrong?

1. Check [directory scanning](configuration#directory-scanning) includes both files
2. Verify [property names](configuration#direct-relationship-properties) are correct
3. Use wiki link format: `[[note name]]`
4. Run [full rescan](configuration#indexing) to rebuild relationships

---

## Graph

### Why isn't my file showing in the graph?

Check:
1. File is in an [indexed directory](configuration#directory-scanning)
2. File has relationships (`Parent`, `Child`, or `Related`)
3. Filters aren't hiding it
4. View mode is appropriate (Hierarchical vs Related)

### My color rule isn't working. Why?

Check:
1. [Expression syntax](features/color-rules#expression-syntax) is valid JavaScript
2. Property names match exactly (case-sensitive)
3. Rule is [enabled](features/color-rules#enablingdisabling-rules)
4. Rule [order](features/color-rules#rule-order--priority) (first match wins)
5. Property exists in frontmatter (use [tooltips](features/tooltips) to verify)

---

## Node Creation

### Where are new nodes created?

New nodes are created in the **same folder** as the source file.

### What is a Zettel ID?

A unique timestamp-based identifier (`YYYYMMDDHHmmss`) assigned to each new node. Useful for Zettelkasten workflows and ensuring unique node IDs.

---

## Get Help

- [Troubleshooting Guide](troubleshooting)
- [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
- [Report Bug](https://github.com/Real1tyy/Nexus-Properties/issues)
