---
sidebar_position: 6
---

# Graph Filtering

Filter your relationship graph to show only nodes that match specific criteria. This helps you focus on relevant parts of your knowledge network by hiding nodes that don't match your filter expressions.

## How Filtering Works

Filtering uses JavaScript expressions to evaluate each node's frontmatter. Only nodes where **ALL** expressions return `true` are shown.

### Filter Logic

1. **Evaluate all expressions** for each node
2. **AND logic** - All expressions must be true
3. **Show matching nodes** and their edges
4. **Hide non-matching nodes**
5. **Source node always shown** (never filtered out)

:::info Source Node Exception
The source node (file you're currently viewing) is always visible, even if it doesn't match filters. This ensures context is never lost.
:::

## Using the Filter Bar

### Showing the Filter Bar

Three ways to show/hide the filter bar:

1. **Command**: "Toggle Graph Filter (Expression Input)"
2. **Default visible**: Enable in [settings](../configuration#show-filter-bar-by-default)
3. **Command**: "Toggle Graph Filter (Preset Selector)" (shows presets dropdown)

### Expression Input

The filter input accepts multiple expressions, one per line:

```
status === 'active'
type === 'project'
```

Both expressions must be true for a node to be shown.

### Applying Filters

Filters are applied automatically when you:
- **Blur** the input (click outside)
- **Press** `Ctrl/Cmd+Enter`

### Clearing Filters

To clear all filters:
1. Delete all text from the filter input
2. Press `Ctrl/Cmd+Enter` or click outside
3. All nodes are shown again

## Filter Expressions

### Accessing Properties

Inside expressions, access frontmatter properties directly by name:

```javascript
// If frontmatter is:
// ---
// status: active
// priority: high
// tags: [project, work]
// ---

// You can write:
status === 'active'
priority === 'high'
tags.includes('project')
```

### Expression Syntax

**Equality**:
```javascript
status === 'active'
type === 'project'
priority !== 'low'
```

**Comparison**:
```javascript
progress > 50
count <= 10
age >= 18
```

**Logical AND**:
```javascript
status === 'active' && priority === 'high'
```

**Logical OR** (within one expression):
```javascript
status === 'active' || status === 'pending'
```

**Array checks**:
```javascript
Array.isArray(tags) && tags.includes('important')
Array.isArray(tags) && tags.length > 0
```

**String methods**:
```javascript
title.includes('Project')
title.startsWith('DRAFT')
title.toLowerCase() === 'important'
```

**Property existence**:
```javascript
typeof status !== 'undefined'
status !== null
```

## Example Filters

### Show Active Items

```javascript
status === 'active'
```

**Result**: Only nodes with `status: active`

### Show High Priority Projects

```javascript
type === 'project'
priority === 'high'
```

**Result**: Only nodes that are BOTH projects AND high priority

### Show Tagged Notes

```javascript
Array.isArray(tags) && tags.includes('work')
```

**Result**: Only notes tagged with "work"

### Show In-Progress or Review

```javascript
status === 'in-progress' || status === 'review'
```

**Result**: Notes in either status

### Show Notes with Attachments

```javascript
Array.isArray(attachments) && attachments.length > 0
```

**Result**: Notes that have attachments

### Show Incomplete High-Priority

```javascript
status !== 'complete'
priority === 'high'
```

**Result**: High-priority items not yet completed

### Show Recent Notes (with date property)

```javascript
typeof date !== 'undefined' && new Date(date) > new Date('2024-01-01')
```

**Result**: Notes with dates after Jan 1, 2024

## Filter Presets

Save frequently-used filters as named presets for quick access.

### Creating Presets

1. Open Settings → Nexus Properties → Graph filtering
2. Scroll to "Filter presets"
3. Click "Add Preset"
4. Enter preset **name** (e.g., "Active Tasks")
5. Enter filter **expression** (e.g., `status === 'active'`)

### Using Presets

1. Use command: "Toggle Graph Filter (Preset Selector)"
2. Click the preset dropdown that appears
3. Select a preset from the list
4. Filter expression input is filled automatically
5. Filter is applied immediately

### Pre-fill Preset on Startup

Configure a preset to automatically fill the filter input when the graph opens.

**Setting up Pre-fill**:
1. Open Settings → Nexus Properties → Graph filtering
2. Scroll to "Pre-fill filter preset"
3. Select a preset from the dropdown (or "None" to disable)
4. Next time the graph opens, the preset will be pre-filled

**Key Differences**:
- **Filter Expressions** (default) - Permanently applied, cannot be cleared by users
- **Pre-fill Preset** - Initial suggestion that users can modify or clear anytime

**When to Use**:
- Provide a helpful starting filter without forcing it
- Reduce repetitive filtering while maintaining flexibility
- Set up different defaults per vault or workflow

### Preset Examples

| Name | Expression | Description |
|------|------------|-------------|
| Active Tasks | `status === 'active'` | Show only active items |
| High Priority | `priority === 'high'` | Show high-priority notes |
| Projects Only | `type === 'project'` | Show only project notes |
| Work Notes | `Array.isArray(tags) && tags.includes('work')` | Work-related notes |
| Incomplete | `status !== 'complete'` | Not yet completed |
| Urgent | `priority === 'urgent'` \| `status === 'urgent'` | Urgent items |

### Managing Presets

**Edit preset**:
- Change name or expression in settings
- Press Enter or click outside to save

**Delete preset**:
- Click the **×** button next to the preset

**Reorder presets**:
- Presets appear in the order defined in settings
- No explicit reordering (yet)

## Multi-Expression Filtering

Use multiple expressions (one per line) to create AND conditions.

### Example: Active High-Priority Projects

```javascript
type === 'project'
status === 'active'
priority === 'high'
```

**Result**: Nodes must match ALL three conditions

**Equivalent to**:
```javascript
type === 'project' && status === 'active' && priority === 'high'
```

### Example: Tagged Work Notes

```javascript
Array.isArray(tags) && tags.includes('work')
status !== 'archived'
```

**Result**: Work-tagged notes that aren't archived

## Filter Behavior

### Source Node

The source node (currently viewed file) is **always shown**, even if it doesn't match the filter.

**Why?**
- Maintain context
- Show the file you're working with
- Always see the starting point

### Connected Edges

When a node is hidden by filters:
- **Edges to/from that node** are also hidden
- **Remaining nodes** stay connected
- **Graph re-layouts** to accommodate visible nodes

### Empty Results

If no nodes match the filter (except source):
- Only the source node is shown
- No edges are shown
- Clear filters or adjust expressions to see more nodes

## Combining with Other Features

### Filtering + Color Rules

Use both together for powerful visualization:

1. **Color by category** (type, priority, status)
2. **Filter to focus** (show only active projects)
3. **Result**: Colored visualization of filtered subset

**Example**:
- Color rule: `type === 'project'` → Blue
- Filter: `status === 'active'`
- Result: Only active notes shown, projects are blue

### Filtering + View Modes

Filters work with all view modes:

- **Hierarchical**: Filter hides branches that don't match
- **Related**: Filter hides non-matching related nodes
- **All Related**: Filter affects entire constellation

### Filtering + Search

Use together for precise navigation:

1. **Apply filter** to reduce node count
2. **Use search** to find specific nodes in filtered set
3. **Navigate** to matching nodes

## Use Cases

### Project Management Dashboard

**Show only active high-priority items**:
```javascript
status === 'active'
priority === 'high'
```

**Result**: Focus dashboard for critical tasks

### Knowledge Review

**Show notes needing review**:
```javascript
typeof lastReviewed === 'undefined' || new Date(lastReviewed) < new Date('2024-01-01')
```

**Result**: Notes not reviewed recently

### Archival Cleanup

**Show archived or old notes**:
```javascript
status === 'archived' || typeof lastModified !== 'undefined' && new Date(lastModified) < new Date('2023-01-01')
```

**Result**: Candidates for archiving

### Content Audit

**Show notes missing metadata**:
```javascript
typeof status === 'undefined' || typeof type === 'undefined'
```

**Result**: Notes that need metadata added

### Topic Exploration

**Show notes about a specific topic**:
```javascript
Array.isArray(tags) && (tags.includes('machine-learning') || tags.includes('ai'))
```

**Result**: All ML/AI related notes

## Troubleshooting

### Filter Not Working

**Check expression syntax**:
- Valid JavaScript required
- Property names case-sensitive
- Strings need quotes
- Use `===` not `=`

**Check property names**:
- Match exactly what's in frontmatter
- Check for typos
- Use [tooltips](tooltips) to verify property names

**Check console for errors**:
- Open developer console (`Ctrl/Cmd+Shift+I`)
- Look for evaluation errors
- Invalid expressions are logged

### No Nodes Shown

**Too restrictive**:
- Expressions might not match any nodes
- Try each expression separately
- Broaden criteria

**Property doesn't exist**:
- Nodes might not have the property
- Check frontmatter of a few nodes
- Add existence check: `typeof prop !== 'undefined' && prop === 'value'`

### Source Node Doesn't Match Filter

This is intentional! Source node is always shown for context.

**To match filter behavior**:
- Navigate to a file that matches the filter
- Or adjust filter to include source node

### Filter Applied But Nodes Still Show

**Check expression logic**:
- Maybe expression is too broad
- Use AND (`&&`) to narrow down
- Add multiple expressions (one per line)

**Check for property variations**:
- Status might be "Active" vs "active" (case matters)
- Extra spaces in values
- Different property names

## Performance Tips

### For Large Graphs

1. **Simple expressions** are faster than complex ones
2. **Fewer expressions** evaluate faster
3. **Specific filters** reduce node count, improving performance

### Optimization

**Fast**:
```javascript
status === 'active'
type === 'project'
```

**Slower** (but still fine):
```javascript
Array.isArray(tags) && tags.some(t => t.startsWith('prefix'))
title.toLowerCase().includes('search term')
```

## Tips & Best Practices

1. **Start broad, then narrow** - Apply general filter first, then add specifics
2. **Use presets** for common filters to save time
3. **Test expressions** in console first if unsure
4. **Combine with view modes** for different perspectives
5. **Use with color rules** for visual categories
6. **Clear filters** when done to see full graph
7. **Check tooltips** to verify property values before filtering

## Next Steps

- [Learn about Color Rules](color-rules) to combine with filtering
- [Use Search](search) for quick node finding
- [Explore View Modes](graph-views) with filtering applied
- [Customize settings](../configuration#graph-filtering)
