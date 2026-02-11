---
sidebar_position: 99
---

# Troubleshooting

Common issues and solutions. For general questions, see [FAQ](faq).

## Bases View Filter Errors

**Error:**
```
Failed to evaluate a filter: Type error in "contains" parameter "value". Expected String, given File.
```

**Cause:** Relationship properties are set to empty strings (`""`) instead of valid values.

**Fix:** Use `null` for empty relationships, not empty strings:

```yaml
# Correct
Parent: null
Child: null

# Incorrect — causes filter errors
Parent: ""
Child: ""
```

Valid formats are `null` (no relationship), a single wiki link (`"[[Note]]"`), or a list of wiki links. See [Bidirectional Sync](features/bidirectional-sync#relationship-types) for property formats.

:::note
Nodes created after v1.6.0 use `null` for excluded properties automatically.
:::

---

## Graph Not Showing Nodes

1. File must be in an [indexed directory](configuration#directory-scanning) (default: `["*"]` scans all)
2. File needs `Parent`, `Child`, or `Related` properties in frontmatter
3. Clear any active [filters](features/filtering) to test
4. Match [view mode](features/graph-views#view-modes) to relationship type (Hierarchical for parent-child, Related for related)

---

## Expression Rules Not Working

Applies to both [color rules](features/color-rules) and [filter expressions](features/filtering):

1. Expression must be valid JavaScript
2. Property names are **case-sensitive** — `status` is not `Status`
3. Strings need quotes: `status === 'active'` (not `status === active`)
4. Rule must be enabled (checkbox checked)
5. For color rules: order matters — [first match wins](features/color-rules#rule-order)
6. Verify the property exists using [tooltips](features/tooltips)
7. Check console for errors: `Ctrl/Cmd+Shift+I`

---

## Console Errors

Open the developer console (`Ctrl/Cmd+Shift+I` → Console tab) to check for errors.

**Common errors:**
- **"File not found"** — Orphaned relationship; run a [full rescan](configuration#indexing)
- **"Invalid expression"** — Fix JavaScript syntax in [color rules](features/color-rules) or [filters](features/filtering)
- **"Circular relationship"** — System prevented a circular link (working as intended)
- **"Property not found"** — Property doesn't exist in the file's frontmatter

---

## Get Help

**Bug report checklist:**
- Obsidian version (Help → About)
- Plugin version (Settings → Community Plugins)
- Console errors (`Ctrl/Cmd+Shift+I`)
- Steps to reproduce
- Expected vs actual behavior

**Where to get help:**
- [FAQ](faq) — Common questions
- [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues) — Bug reports
- [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions) — Community Q&A
