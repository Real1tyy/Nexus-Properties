---
sidebar_position: 6
---

# Filtering

Filter nodes using JavaScript expressions. Only nodes where ALL expressions return `true` are shown.

## Using Filters

**Show filter bar**: Command "Toggle Graph Filter (Expression Input)" or [enable by default](../configuration#show-filter-bar-by-default)

**Apply**: Blur input or press `Ctrl/Cmd+Enter`

**Clear**: Delete all text and apply

:::info
Source node always visible, even if doesn't match filters.
:::

## Expression Syntax

Access frontmatter properties directly:

```javascript
// Equality
status === 'active'
type !== 'archived'

// Comparison
progress > 50
priority >= 'high'

// Logical
status === 'active' && priority === 'high'
status === 'active' || status === 'pending'

// Arrays
Array.isArray(tags) && tags.includes('work')
tags.length > 0

// Strings
title.includes('Project')
title.startsWith('DRAFT')

// Existence
typeof status !== 'undefined'
```

## Multi-Expression (AND Logic)

One expression per line. All must be true:

```javascript
type === 'project'
status === 'active'
priority === 'high'
```

Equivalent to: `type === 'project' && status === 'active' && priority === 'high'`

## Filter Presets

**Create**: Settings → Nexus Properties → Graph filtering → Add Preset

**Use**: Command "Toggle Graph Filter (Preset Selector)" → Select preset

**Pre-fill on startup**: Settings → Pre-fill filter preset

**Difference**:
- **Filter Expressions** (default): Permanently applied, users can't clear
- **Pre-fill Preset**: Initial suggestion, users can modify/clear

## Example Presets

| Name | Expression | Description |
|------|------------|-------------|
| Active Tasks | `status === 'active'` | Only active items |
| High Priority | `priority === 'high'` | High-priority notes |
| Work Notes | `Array.isArray(tags) && tags.includes('work')` | Work-related |
| Incomplete | `status !== 'complete'` | Not yet completed |

## Combining Features

**Filtering + Color Rules**: Color by category, filter to focus
**Filtering + View Modes**: Works in all modes
**Filtering + Search**: Filter first, then search within results

## Next Steps

- [Color Rules](color-rules) - Combine with filtering
- [Search](search) - Find specific nodes
- [Graph Views](graph-views) - Apply filters in different modes
