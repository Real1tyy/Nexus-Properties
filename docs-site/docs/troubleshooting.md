---
sidebar_position: 99
---

# Troubleshooting

Critical troubleshooting steps for common issues. For other questions, see [FAQ](faq) or [open an issue](https://github.com/Real1tyy/Nexus-Properties/issues).

## Bases View Filter Errors

**Error message:**
```
Failed to evaluate a filter: Type error in "contains" parameter "value". Expected String, given File.
```

**Cause:** Relationship properties (`Parent`, `Child`, `Related`) are set to empty strings (`""`) instead of proper values.

**Solution:**

Update the property to one of these valid formats:

1. **Null/empty** (no relationships):
   ```yaml
   Parent: null
   Child: null
   Related: null
   ```

2. **Single relationship**:
   ```yaml
   Parent: "[[Parent Note]]"
   ```

3. **Multiple relationships** (list):
   ```yaml
   Child:
     - "[[Child 1]]"
     - "[[Child 2]]"
   ```

**Important:** Never use empty strings for relationship properties:
```yaml
Parent: ""    # ❌ Causes filter errors
Child: ""     # ❌ Causes filter errors
Related: ""   # ❌ Causes filter errors
```

**Note:** New nodes created after version 1.6.0 automatically use `null` for excluded properties.

---

## Graph Not Showing Nodes

**Check:**
1. File is in an [indexed directory](configuration#directory-scanning) (or use `["*"]` to scan all)
2. File has `Parent`, `Child`, or `Related` properties in frontmatter
3. No active filters hiding nodes (clear to test)
4. View mode matches relationship type (Hierarchical for parent-child, Related for related)

---

## Expression Rules Not Working

**Check:**
1. Expression syntax is valid JavaScript
2. Property names match exactly (case-sensitive)
3. Strings use quotes: `status === 'active'` (not `status === active`)
4. Rule is enabled (checkbox checked)
5. Rule order matters - first match wins (use ↑/↓ to reorder)
6. Property exists in frontmatter (use tooltips to verify)
7. Console for errors: `Ctrl/Cmd+Shift+I`

---

## Console Errors

Open developer console to check for errors:
- Press `Ctrl/Cmd+Shift+I` → Console tab
- Look for red error messages
- Copy errors for bug reports

**Common errors:**
- **"File not found"** - Orphaned relationship, run full rescan
- **"Invalid expression"** - Fix JavaScript syntax in color rules/filters
- **"Circular relationship"** - System prevented circular link (working as intended)
- **"Property not found"** - Property doesn't exist in frontmatter

---

## Get Help

**Bug report checklist:**
- Obsidian version (Help → About)
- Plugin version (Settings → Community Plugins)
- Console errors (`Ctrl/Cmd+Shift+I`)
- Steps to reproduce
- Expected vs actual behavior

**Where to get help:**
- [FAQ](faq)
- [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues)
- [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
