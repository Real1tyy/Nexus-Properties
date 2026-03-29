---
sidebar_position: 98
---

# Frequently Asked Questions

## 🔍 General

<details>
<summary>What's the difference between this and Obsidian's built-in graph?</summary>

Obsidian's graph shows backlinks between notes. Nexus Properties shows **frontmatter-based relationships** with automatic [bidirectional sync](features/bidirectional-sync), multiple [view modes](features/graph-views), [color rules](features/color-rules), [filtering](features/filtering), and [zoom previews](features/zoom-mode).

</details>

<details>
<summary>Why use frontmatter relationships instead of backlinks?</summary>

- **Explicit structure** — Define clear parent-child hierarchies, not just loose links
- **Bidirectional sync** — Set once, both sides update automatically
- **Typed relationships** — Distinguish between parent, child, and related
- **Queryable** — Filter and search based on relationship properties

</details>

---

## 🔗 Relationships

<details>
<summary>How do I break a relationship?</summary>

Delete the relationship from one file's frontmatter — the reverse is removed automatically. Or right-click an edge in the graph → "Remove Relationship". See [Context Menus](features/context-menus#edge-context-menu).

</details>

<details>
<summary>My relationships aren't syncing</summary>

1. Check [directory scanning](configuration#directory-scanning) includes both files
2. Verify [property names](configuration#direct-relationship-properties) match your frontmatter
3. Use wiki link format: `"[[note name]]"`
4. Run a [full rescan](configuration#indexing) to rebuild relationships

</details>

---

## 📊 Graph

<details>
<summary>Why isn't my file showing in the graph?</summary>

1. File must be in an [indexed directory](configuration#directory-scanning)
2. File needs at least one relationship (`Parent`, `Child`, or `Related`)
3. Check that [filters](features/filtering) aren't hiding it
4. Ensure the [view mode](features/graph-views#view-modes) matches your relationship type

</details>

<details>
<summary>My color rule isn't working</summary>

1. Check [expression syntax](features/color-rules#example-rules) — must be valid JavaScript
2. Property names are case-sensitive
3. Verify the rule is enabled and check [rule order](features/color-rules#rule-order) (first match wins)
4. Confirm the property exists in frontmatter (use [tooltips](features/tooltips) to verify)

</details>

---

## ✨ Node Creation

<details>
<summary>Where are new nodes created?</summary>

In the **same folder** as the source file. See [Node Creation](features/node-creation) for details.

</details>

<details>
<summary>What is a Zettel ID?</summary>

A unique timestamp identifier (`YYYYMMDDHHmmss`) assigned to each new node. Configured in [Settings](configuration#node-creation-shortcuts).

</details>

---

## 🛠️ Get Help

<details>
<summary>Something isn't working as expected — what should I do?</summary>

Check the [Troubleshooting guide](troubleshooting) for common issues and solutions. If your problem isn't covered there, please [open a GitHub issue](https://github.com/Real1tyy/Nexus-Properties/issues/new/choose) with steps to reproduce.

</details>

---

## 💙 Support

<details>
<summary>How can I support the project?</summary>

Subscribe to the [YouTube channel](https://www.youtube.com/@real1tyy?utm_campaign=nexus_properties&utm_source=docs&utm_medium=faq&utm_content=youtube_channel), share the plugin with others, or [donate](https://matejvavroproductivity.com/support/?utm_campaign=nexus_properties&utm_source=docs&utm_medium=faq&utm_content=donate). See the [Support page](support) for all options.

</details>
