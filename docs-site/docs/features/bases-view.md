# Bases View

List-based view of the current note's relationships. Shows children, parent, and related notes.

## Sections

**Children**: Notes with current note as parent

**Parent**: Notes with current note as child

**Related**: Notes with mutual related connections

**Auto-filtering**: Excludes notes with `_Archived: true`

## Usage

**Switch views**: Click "Switch to Bases View" / "Switch to Graph View" button

**Navigate**: Click any note name to open it

## Custom Sorting

Define formulas and sort rules in **Settings → Nexus Properties → Bases View**.

**Formula example** (priority sorting):
```yaml
_priority_sort: |-
  [
    ["Very High", 1],
    ["High", 2],
    ["Medium", 3],
    ["Low", 4],
    ["null", 5]
  ].filter(value[0] == Priority.toString())[0][1]
```

**Sort configuration example**:
```yaml
- property: formula._status_sort
  direction: ASC
- property: formula._priority_sort
  direction: ASC
- property: file.mtime
  direction: DESC
```

:::note
Enter only the content AFTER `formulas:` and `sort:` keywords. The plugin adds these automatically.
:::

## Next Steps

- [Graph Views](graph-views) - Visual network exploration
- [Bidirectional Sync](bidirectional-sync) - Relationship management
