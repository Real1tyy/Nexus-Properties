---
sidebar_position: 12
---

# Property Exclusion

Control which frontmatter properties are copied when creating new nodes.

## How It Works

When creating nodes via [quick creation commands](node-creation):

1. Load source file frontmatter
2. Apply default exclusions (always filtered)
3. Apply path-based exclusions (if path matches)
4. Copy remaining properties to new node
5. Add relationship properties
6. Generate new Zettel ID (if configured)

## Default Exclusions

**Always excluded**:
- `Parent`, `Child`, `Related` (would create incorrect links)
- `_ZettelID` (each note needs unique ID)

**Configure**: Settings → Nexus Properties → Excluded properties → Default excluded properties

**Example**: `Parent, Child, Related, _ZettelID, date, created, modified`

## Path-Based Rules

Exclude additional properties for files in specific directories.

**Path matching**: Uses `startsWith` (case-sensitive)
- `Projects/Work` matches `Projects/Work/Task.md` ✅
- `Projects/Work` matches `Projects/WorkRelated/Note.md` ❌

**Creating rules**: Settings → Nexus Properties → Excluded properties → Add Rule

**Components**:
- **Path**: Directory path (e.g., `Projects/Work`)
- **Excluded Properties**: Comma-separated (e.g., `status, progress, deadline`)
- **Enabled**: Toggle on/off
- **Order**: ↑/↓ buttons (first match wins)

## Rule Evaluation

**Order**: Top to bottom, first matching rule is used
**Additive**: Path rules add to default exclusions (don't replace)

**Example**:
- Default: `Parent, Child, Related, _ZettelID`
- Path rule (`Projects/`): `status, progress`
- Total for Projects files: `Parent, Child, Related, _ZettelID, status, progress`

## Next Steps

- [Node Creation](node-creation) - See exclusions in action
- [Bidirectional Sync](bidirectional-sync) - Relationship management
- [Configuration](../configuration#excluded-properties) - Settings reference
