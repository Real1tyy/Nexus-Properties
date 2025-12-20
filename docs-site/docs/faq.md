---
sidebar_position: 98
---

# Frequently Asked Questions

Common questions about Nexus Properties and their answers.

## General Questions

### What is Nexus Properties?

Nexus Properties is an Obsidian plugin that automatically manages bidirectional relationships (parent-child, related) and provides an interactive relationship graph to visualize and navigate your knowledge network.

### Is it free?

Yes! Nexus Properties is completely free and open source under the MIT license.

### Does it work on mobile?

The plugin is currently focused on desktop use. Mobile support is not guaranteed but may work with limitations.

### What's the difference between this and Obsidian's built-in graph?

Obsidian's graph shows backlinks. Nexus Properties shows **frontmatter-based relationships** with automatic bidirectional sync, multiple view modes, color rules, filtering, and zoom previews.

## Relationship Management

### Why use frontmatter relationships instead of backlinks?

- **Explicit structure**: Define clear parent-child hierarchies
- **Bidirectional sync**: Set once, updates both sides automatically
- **Typed relationships**: Distinguish between parent, child, and related
- **Queryable**: Filter and search based on relationship properties

### Can I use both backlinks and Nexus Properties?

Yes! They complement each other. Use backlinks for general references, Nexus Properties for structured relationships.

### What happens if I manually edit relationships in both files?

The plugin will sync them on next file change. However, it's best to let the plugin handle bidirectional sync automatically.

### Can I have multiple parents?

By default, a file can have one parent. If you need multiple, you can manually add them, but the plugin is designed for tree hierarchies (single parent).

### How do I break a relationship?

1. Delete the relationship from one file's frontmatter
2. Plugin automatically removes it from the other file
3. Or use context menu: Right-click edge → "Remove Relationship"

## Graph Features

### Why isn't my file showing in the graph?

Check:
1. File is in an [indexed directory](configuration#directory-scanning)
2. File has relationships (`Parent`, `Child`, or `Related`)
3. Filters aren't hiding it
4. View mode is appropriate (Hierarchical vs Related)

### How do I see all my notes in the graph?

- Switch to "All Related" mode
- Ensure directories are scanned
- Clear any active filters
- Check that notes have relationships

### Can I customize the graph layout?

Layout is automatic, but you can:
- Manually drag nodes (positions not saved)
- Adjust view mode for different layouts
- Use filtering to focus on subsets
- Configure [animation duration](configuration#graph-animation-duration)

### How do I save the graph as an image?

Use standard screenshot tools (Snipping Tool, macOS screenshots, etc.) to capture the graph view.

## Performance

### Does the plugin index my entire vault on startup?

Only files in [configured directories](configuration#directory-scanning) are indexed. Use specific directories to limit scope.

## Color Rules & Filtering

### My color rule isn't working. Why?

Check:
1. [Expression syntax](features/color-rules#expression-syntax) is valid JavaScript
2. Property names match exactly (case-sensitive)
3. Rule is [enabled](features/color-rules#enablingdisabling-rules)
4. Rule [order](features/color-rules#rule-order--priority) (first match wins)
5. Property exists in frontmatter (use [tooltips](features/tooltips) to verify)

### Can I have different colors for different note types?

Yes! Create color rules based on a `type` property:

```javascript
type === 'project'  // Blue
type === 'task'     // Green
type === 'note'     // Purple
```

[Learn more about color rules →](features/color-rules)

### How do filters work with view modes?

Filters apply to all view modes. They hide nodes that don't match filter expressions, regardless of Hierarchical/Related/All Related mode.

### Can I save filter presets?

Yes! Use [Filter Presets](features/filtering#filter-presets) to save commonly-used filters with names for quick access.

## Node Creation

### Where are new nodes created?

New nodes are created in the **same folder** as the source file.

### Can I change where new nodes are created?

Not currently. Future versions may support template folders or configurable locations.

### Why is my property not being copied to new nodes?

Check [Excluded Properties](features/excluded-properties):
1. Property might be in [default exclusions](configuration#default-excluded-properties)
2. Property might be in [path-based exclusion rule](features/excluded-properties#path-based-exclusion-rules)

### What is a Zettel ID?

A unique timestamp-based identifier (`YYYYMMDDHHmmss`) assigned to each new node. Useful for Zettelkasten workflows and ensuring unique node IDs.

[Learn more →](features/node-creation#zettel-id-generation)

### Can I disable Zettel ID generation?

Yes! Set the [Zettel ID property](configuration#zettel-id-property) to an empty string in settings.

## Zoom Mode

### What's the difference between Zoom Mode and Tooltips?

- **Tooltips**: Hover for quick property preview
- **Zoom Mode**: Click for full content preview with navigation

[Learn more →](features/zoom-mode)

### Can I edit notes in Zoom Mode?

No, Zoom Mode is read-only preview. Double-click a node or use context menu → "Open in New Tab" to edit.

### How do I exit Zoom Mode?

Click the focused node again, press Escape, or click outside the graph.

## Troubleshooting

### My relationships aren't syncing. What's wrong?

1. Check [directory scanning](configuration#directory-scanning) includes both files
2. Verify [property names](configuration#direct-relationship-properties) are correct
3. Use wiki link format: `[[note name]]`
4. Run [full rescan](configuration#indexing) to rebuild relationships

### The plugin broke after updating. How do I fix it?

1. **Check compatibility**: Ensure Obsidian is version 1.6.0+
2. **Reload plugin**: Settings → Community plugins → Reload
3. **Restart Obsidian**: Close and reopen completely
4. **Check console**: `Ctrl/Cmd+Shift+I` for error messages
5. **Report issue**: [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues)

### How do I reset all settings to defaults?

1. Close Obsidian
2. Navigate to `<vault>/.obsidian/plugins/nexus-properties/`
3. Delete or rename `data.json`
4. Restart Obsidian

:::warning Data Loss
This resets ALL settings including color rules, filters, and exclusions. Export/backup settings first if needed.
:::

### Can I export/import settings?

Not directly through the UI. Advanced users can:
1. Copy `data.json` file between vaults
2. Manually edit JSON (at your own risk)

## Feature Requests & Support

### How do I request a feature?

1. Check [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions) for existing requests
2. Open a new discussion describing your feature
3. Explain use case and benefit

### How do I report a bug?

1. Check [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues) for duplicates
2. Open a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Obsidian version and plugin version
   - Console errors (if any)

### Is there a community forum?

Use [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions) for:
- Questions
- Feature requests
- Use case sharing
- Tips and tricks

### How can I support the project?

- ⭐ **Star on GitHub**: [Nexus Properties Repository](https://github.com/Real1tyy/Nexus-Properties)
- 💰 **Sponsor**: [GitHub Sponsors](https://github.com/sponsors/Real1tyy)
- 🐛 **Report bugs**: Help improve quality
- 📖 **Improve docs**: Submit documentation PRs
- 💬 **Help others**: Answer questions in Discussions

## Advanced Questions

### Can I use this with Dataview?

Yes! Relationships are stored in frontmatter, so Dataview can query them:

```dataview
LIST
WHERE Parent = [[Project Overview]]
```

### Can I use this with Templater?

Yes! New nodes inherit properties, which can include Templater templates or Templater-created properties.

### Does it work with Canvas?

Canvas notes are regular files. If they're in indexed directories with relationships, they'll appear in the graph.

### Can I script relationship creation?

Yes, for advanced users:
1. Modify frontmatter programmatically
2. Plugin will detect changes
3. Bidirectional sync happens automatically

Use `app.fileManager.processFrontMatter()` API.

### How does it handle file conflicts?

If two users edit relationships simultaneously (e.g., in synced vaults):
- Last write wins
- May cause temporary inconsistency
- Run [full rescan](configuration#indexing) to fix

## Migration & Compatibility

### Can I migrate from another system?

If your previous system used frontmatter properties:
1. Rename properties to match Nexus Properties names
2. Run [full rescan](configuration#indexing)
3. Relationships will be synced

### Will it work with my existing notes?

Yes! The plugin:
- Doesn't modify notes without relationships
- Only manages specified properties
- Won't break existing structure

### Can I uninstall without breaking my vault?

Yes! Relationships are stored as frontmatter. If you uninstall:
- Frontmatter remains
- Relationships still readable by humans
- You can reinstall later
- Or use another tool that reads frontmatter

### What happens to my relationships if I uninstall?

They remain in frontmatter. You can:
- Keep them for future use
- Remove manually if desired
- Use other tools that read frontmatter

## About This Documentation

### Is the documentation completely up to date and accurate?

We strive for perfection, but Nexus Properties is a large, feature-rich project with extensive documentation. It's quite complex for one person to manage everything perfectly, so there may be occasional inaccuracies or outdated information.

If you spot something wrong, please help us!

- **Create a Pull Request** to fix it
- **Open an issue** to report it
- **Suggest improvements** or clarifications

Community contributions help us continuously improve the documentation and keep it accurate. Every correction, no matter how small, makes the docs better for everyone. Thank you for helping us improve! 🙏

## Didn't find your answer?

- Check [Troubleshooting](troubleshooting) for common issues
- Search [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
- Open a [new discussion](https://github.com/Real1tyy/Nexus-Properties/discussions/new) or [issue](https://github.com/Real1tyy/Nexus-Properties/issues/new)
