---
sidebar_position: 99
---

# Troubleshooting

Critical troubleshooting steps for common issues. For other questions, see [FAQ](faq) or [open an issue](https://github.com/Real1tyy/Nexus-Properties/issues).

## Graph Not Showing Nodes

**Check:**
1. File is in an [indexed directory](configuration#directory-scanning) (or use `["*"]` to scan all)
2. File has `Parent`, `Child`, or `Related` properties in frontmatter
3. No active filters hiding nodes (clear to test)
4. View mode matches relationship type (Hierarchical for parent-child, Related for related)
5. Run full rescan: Settings → Indexing → "Rescan Everything"

---

## Relationships Not Syncing

**Check:**
1. Property names are correct and case-sensitive: Settings → Direct Relationship Properties
2. Using wiki link format: `[[note name]]` (not plain text or markdown links)
3. Both files are in indexed directories: Settings → Directory Scanning
4. Files are saved (close and reopen if needed)
5. Run full rescan: Settings → Indexing → "Rescan Everything"
6. Console for errors: `Ctrl/Cmd+Shift+I`

**Common errors:**
- Wrong property name (default: `Parent`, `Child`, `Related`)
- Not using `[[wiki links]]`
- Files not in scanned directories

---

## Color Rules Not Working

**Check:**
1. Expression syntax is valid JavaScript
2. Property names match exactly (case-sensitive)
3. Strings use quotes: `status === 'active'` (not `status === active`)
4. Rule is enabled (checkbox checked)
5. Rule order matters - first match wins (use ↑/↓ to reorder)
6. Property exists in frontmatter (use tooltips to verify)
7. Console for errors: `Ctrl/Cmd+Shift+I`

---

## Filter Not Working

**Check:**
1. Expression syntax is valid JavaScript
2. Property names are case-sensitive and exact
3. Filter is applied: Press `Ctrl/Cmd+Enter` or click outside input
4. Source node always visible (intentional)
5. Console for errors: `Ctrl/Cmd+Shift+I`

**If all nodes hidden:**
- Filter too restrictive or property doesn't exist
- Add existence check: `typeof property !== 'undefined' && property === 'value'`
- Clear filter to reset

---

## Commands Grayed Out

**"Create Child/Parent/Related Node" unavailable?**

**Check:**
1. Viewing a markdown file (not graph view alone, not image/PDF)
2. File is in scanned directory: Settings → Directory Scanning
3. File type is markdown (`.md`)

---

## Performance Issues

**Slow graph or startup?**

1. Reduce recursion depth: Settings → All Related Max Depth (5-7) / Hierarchy Depth (10-15)
2. Disable animations: Settings → Graph Animation Duration → 0ms
3. Limit directory scanning: Settings → Directory Scanning (only scan needed folders)
4. Use filters to reduce visible nodes
5. Disable other resource-intensive plugins

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

## Reset Everything

If all else fails:

1. Close Obsidian
2. Navigate to `<vault>/.obsidian/plugins/nexus-properties/`
3. Delete or rename `data.json`
4. Restart Obsidian

:::warning
Resets ALL settings including color rules, filters, and exclusions.
:::

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
