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

## Examples

**Single expressions**:
```javascript
// Equality
status === 'active'
type !== 'archived'

// Comparison
progress > 50
priority >= 'high'

// Logical operators
status === 'active' && priority === 'high'
status === 'active' || status === 'pending'

// Arrays
Array.isArray(tags) && tags.includes('work')
tags.length > 0

// Strings
title.includes('Project')
title.startsWith('DRAFT')

// Existence check
typeof status !== 'undefined'
```

**Multi-expression (AND logic)** - One per line, all must be true:
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

**Common presets**:
- `status === 'active'` - Active Tasks
- `priority === 'high'` - High Priority
- `Array.isArray(tags) && tags.includes('work')` - Work Notes
- `status !== 'complete'` - Incomplete

## Combining Features

**Filtering + Color Rules**: Color by category, filter to focus

**Filtering + View Modes**: Works in all modes

**Filtering + Search**: Filter first, then search within results

## Next Steps

- [Color Rules](color-rules) - Combine with filtering
- [Graph Views](graph-views) - Apply filters in different modes
