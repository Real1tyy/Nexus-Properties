# Bases View

List-based view of the current note's relationships. Shows children, parent, and related notes.

![Bases View](/img/screenshots/bases-view.png)
*List-based view of relationships*

## View Types

Bases view offers three relationship perspectives:

**Children**: Notes with current note as parent

**Parent**: Notes with current note as child

**Related**: Notes with mutual related connections

## Archived Toggle

When the "Exclude Archived" setting is enabled in Settings → Bases View, an **Archived** checkbox toggle appears on the right side of the view selector.

**How it works**:
- **Unchecked** (default): Shows only non-archived files for the selected view type
- **Checked**: Shows only archived files for the selected view type

**Example**:
- Select "Children" view with archived toggle OFF → Shows non-archived children
- Select "Children" view with archived toggle ON → Shows archived children
- Select "Parent" view with archived toggle ON → Shows archived parent (if archived)

## File Names

Bases view displays the `Title` property instead of `file.name` for cleaner, more readable file names.

The title property is stored as a wiki link (e.g., `[[path/to/file|Child]]`), making it:
- **Clickable**: Navigate directly to the file
- **Clean**: Parent name prefixes are stripped (e.g., "Parent - Child" → "Child")

See [Graph Views → Node Labels](graph-views#node-labels) for details on how titles work.

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
