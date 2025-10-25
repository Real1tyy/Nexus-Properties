---
sidebar_position: 12
---

# Property Exclusion System

The property exclusion system controls which frontmatter properties are copied when creating new nodes. This ensures new notes inherit relevant properties while filtering out file-specific or system properties.

## How Exclusion Works

When you create a new node using [quick creation commands](node-creation), the system:

1. **Loads source file frontmatter**
2. **Applies default exclusions** (always filtered)
3. **Applies path-based exclusions** (if path matches)
4. **Copies remaining properties** to new node
5. **Adds relationship properties** (Parent/Child/Related)
6. **Generates new Zettel ID** (if configured)

## Default Excluded Properties

Properties that are **always excluded** from copying, regardless of file location.

### Default List

**Default exclusions**:
- `Parent`
- `Child`
- `Related`
- `_ZettelID`

**Why these are excluded**:
- **Relationship properties**: Would create incorrect links if copied
- **Zettel ID**: Each note needs a unique identifier

### Customizing Defaults

**To modify**:
1. Settings → Nexus Properties → Excluded properties
2. Find "Default excluded properties"
3. Add/remove properties (comma-separated)
4. Click outside or press Enter to save

**Example additions**:
```
Parent, Child, Related, _ZettelID, date, created, modified, file-path
```

**Result**: None of these properties will be copied to new nodes anywhere in your vault.

[Configure defaults →](../configuration#default-excluded-properties)

## Path-Based Exclusion Rules

Exclude **additional properties** for files in specific directories. These are added on top of the default exclusions.

### How Path Matching Works

Rules use **startsWith** matching:
- File path must start with the rule's path
- Path is case-sensitive
- Trailing slashes don't matter

**Example rule path**: `Projects/Work`

**Matches**:
- `Projects/Work/Project A.md` ✅
- `Projects/Work/Tasks/Task 1.md` ✅
- `Projects/WorkRelated/Note.md` ❌ (doesn't match exactly)
- `Other/Projects/Work/Note.md` ❌ (doesn't start with path)

### Creating Path Rules

**To create a rule**:
1. Settings → Nexus Properties → Excluded properties
2. Scroll to "Path-based exclusion rules"
3. Click "Add Rule"
4. Enter **Path**: Directory path (e.g., `Projects/Work`)
5. Enter **Excluded Properties**: Comma-separated list (e.g., `status, progress, deadline`)
6. Click outside to save

### Rule Components

Each path-based rule has:

**Path** (Required)
- Directory path to match
- Case-sensitive
- Uses startsWith matching
- Example: `Daily Notes/2024/`

**Excluded Properties** (Required)
- Comma-separated property names
- Added to default exclusions
- Example: `date, weekday, journal-entry`

**Enabled** (Toggle)
- Turn rule on/off
- Disabled rules are skipped
- Useful for temporary changes

**Order** (↑/↓ buttons)
- Rules evaluated top to bottom
- First matching rule is used
- Reorder with up/down buttons

## Rule Evaluation

### Order of Evaluation

When creating a new node:

1. **Load source frontmatter**
2. **Check default exclusions** (always applied)
3. **Find first matching path rule** (top to bottom)
4. **Add path rule exclusions** to default list
5. **Filter out all excluded properties**
6. **Copy remaining properties**

### Multiple Rules

**Only the first matching rule is used:**

**Example rules** (top to bottom):
1. Path: `Projects/Work` → Exclude: `status, progress`
2. Path: `Projects/` → Exclude: `deadline, budget`

**File**: `Projects/Work/Task.md`

**Result**: Excludes `status, progress` (rule 1 matches, rule 2 skipped)

**File**: `Projects/Personal/Note.md`

**Result**: Excludes `deadline, budget` (rule 1 doesn't match, rule 2 matches)

:::tip Rule Order
Place more specific paths above more general paths to ensure specific rules take precedence.
:::

## Example Configurations

### Daily Notes

**Scenario**: Don't copy date-specific properties from daily notes

**Rule**:
- **Path**: `Daily Notes/`
- **Excluded**: `date, weekday, journal-entry, mood, weather`

**Result**: New notes from daily notes won't inherit date metadata

### Project Files

**Scenario**: Don't copy project status when creating child tasks

**Rule**:
- **Path**: `Projects/`
- **Excluded**: `status, progress, deadline, budget, phase`

**Result**: Tasks inherit project metadata but not status/progress

### Templates

**Scenario**: Don't copy template metadata to instances

**Rule**:
- **Path**: `Templates/`
- **Excluded**: `template-version, template-author, template-date, is-template`

**Result**: Notes created from templates don't inherit template metadata

### Meeting Notes

**Scenario**: Don't copy meeting-specific properties

**Rule**:
- **Path**: `Meetings/`
- **Excluded**: `meeting-date, attendees, agenda, minutes`

**Result**: Action items inherit project metadata but not meeting details

### Archive Folder

**Scenario**: Don't copy archived/completed status

**Rule**:
- **Path**: `Archive/`
- **Excluded**: `archived-date, archived-by, original-path, archived`

**Result**: Notes derived from archived notes don't inherit archive metadata

## Managing Rules

### Enabling/Disabling Rules

Toggle rules on/off without deleting:

1. Find rule in settings
2. Click checkbox on left
3. Unchecked = disabled (rule skipped)
4. Checked = enabled (rule evaluated)

**Use cases**:
- Temporarily test without a rule
- Switch between rule sets
- Debug exclusion issues

### Reordering Rules

Change rule priority with ↑/↓ buttons:

**Before** (too general first):
1. `Projects/` → Exclude status
2. `Projects/Work/` → Exclude deadline

**Problem**: Rule 1 always matches for Work projects, rule 2 never runs

**After** (specific first):
1. `Projects/Work/` → Exclude deadline
2. `Projects/` → Exclude status

**Solution**: Work projects get deadline excluded, others get status excluded

### Deleting Rules

Permanently remove a rule:

1. Find rule in settings
2. Click **×** button on right
3. Rule is deleted immediately

:::warning No Undo
Deletion is permanent. Consider disabling instead if you might need the rule later.
:::

## Combining Default + Path Rules

### Additive Behavior

Path rules **add** to default exclusions, they don't replace them.

**Example**:

**Default exclusions**: `Parent, Child, Related, _ZettelID`

**Path rule** (`Projects/`): `status, progress`

**Total exclusions for Projects files**: `Parent, Child, Related, _ZettelID, status, progress`

### Override Not Possible

You **cannot** include a property that's in default exclusions:

**Default**: `Parent, Child, _ZettelID`

**Path rule**: `Parent, status` (path rule adds status, Parent already excluded)

**Result**: `Parent, Child, _ZettelID, status` all excluded (cannot un-exclude Parent)

:::info No Overrides
Path rules only add exclusions, they cannot remove defaults. If you need to include a default-excluded property, remove it from defaults.
:::

## Use Cases

### Separating Concerns

**Scenario**: Projects have status, tasks should not inherit it

**Solution**:
- Create tasks from projects
- Exclude status in Projects/ path
- Tasks get project metadata minus status

**Benefit**: Tasks track their own status independently

### Temporal Separation

**Scenario**: Daily notes have dates, derived notes should not

**Solution**:
- Create notes from daily notes
- Exclude date properties in Daily Notes/ path
- Derived notes are timeless

**Benefit**: Concepts extracted from daily notes aren't date-bound

### Template Hygiene

**Scenario**: Templates have metadata, instances should not

**Solution**:
- Create instances from templates
- Exclude template-specific properties
- Instances only get content-relevant properties

**Benefit**: Clean instances without template cruft

### Privacy Levels

**Scenario**: Private folders have sensitive metadata

**Solution**:
- Don't copy private metadata to shared notes
- Exclude sensitive properties in Private/ path
- New notes are shareable

**Benefit**: Prevent metadata leaks

## Troubleshooting

### Property Still Being Copied

**Check default exclusions**:
- Property might not be in default list
- Add it to defaults if should always exclude

**Check path-based rules**:
- Rule path might not match file path
- Check exact path spelling
- Verify rule is enabled

**Check rule order**:
- A more general rule might match first
- Reorder with ↑/↓ buttons
- Put specific rules above general ones

**Check file location**:
- File must be in path that matches rule
- Verify file path starts with rule path

### Property Not Being Copied (Should Be)

**Check default exclusions**:
- Property might be in default list
- Remove from defaults if should copy

**Check path-based rules**:
- File might be in a path with exclusion rule
- Disable rule or move file

**Check property exists**:
- Verify property in source frontmatter
- Check spelling matches exactly

### Rule Not Matching Files

**Check path spelling**:
- Paths are case-sensitive
- `Projects/` ≠ `projects/`
- Check for typos

**Check path format**:
- Use folder structure: `Folder/Subfolder`
- Not file paths: `Folder/Subfolder/file.md` ❌

**Check startsWith behavior**:
- File path must start with rule path
- Partial matches don't work

### Multiple Rules Conflicting

**Only first match is used**:
- Rules evaluated top to bottom
- First matching rule wins
- Subsequent rules ignored

**Solution**:
- Reorder rules for correct priority
- More specific paths should be first
- Test with a few files

## Best Practices

1. **Default exclusions for universal properties** - Relationship properties, Zettel IDs
2. **Path rules for context-specific properties** - Project status, meeting dates
3. **Specific paths above general** - `Projects/Work/` before `Projects/`
4. **Test with sample files** before applying widely
5. **Document your exclusion strategy** in a note for reference
6. **Review regularly** - Remove unused rules, add new as needed
7. **Use enable/disable** for temporary changes instead of deleting

## Tips & Tricks

### Exclude File Metadata

Properties added by Obsidian or other plugins:

```
file, path, created, modified, size, tags (if using frontmatter tags)
```

Add to defaults if you don't want these copied.

### Exclude Private Properties

Properties starting with underscore or marked private:

```
_private, _internal, _system, _cache
```

Or use "Hide underscore properties" setting.

### Exclude Derived Properties

Properties that should be recalculated per file:

```
word-count, last-edit, version, checksum
```

### Project-Specific Properties

For project management workflows:

```
status, progress, deadline, assigned-to, priority, phase
```

## Next Steps

- [Learn about Node Creation](node-creation) to see exclusions in action
- [Configure Default Exclusions](../configuration#default-excluded-properties)
- [Configure Path Rules](../configuration#excluded-properties)
- [Understand Property Inheritance](node-creation#property-inheritance)
