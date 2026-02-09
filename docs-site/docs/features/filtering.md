---
sidebar_position: 6
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Filtering
<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/Filters.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

Filter nodes using JavaScript expressions. Only nodes where ALL expressions return `true` are shown.

*Active filtering with JavaScript expressions*

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

## Indirect Connections

When filtering removes intermediate nodes, Nexus Properties can automatically maintain connections between the remaining nodes.

**How it works**:
- If you have A → B → C
- And filtering removes B
- The graph will show A → C

**Enable/Disable**: Settings → Nexus Properties → Graph → "Maintain indirect connections when filtering"

**Default**: Enabled

**Benefits**:
- **Prevents fragmentation**: Graph stays connected even when filtering removes nodes
- **Maintains context**: See relationships between distant nodes
- **Better readability**: Understand the full relationship structure

**Example**:
```
Original: Person → Meeting → Project
Filter out meetings: Person → Project (indirect connection created)
```

This feature is especially useful when:
- Filtering by node type to hide intermediaries
- Using search to focus on specific nodes
- Analyzing deep relationship chains
- Exploring connections across multiple levels

## Combining Features

**Filtering + Color Rules**: Color by category, filter to focus

**Filtering + View Modes**: Works in all modes

**Filtering + Search**: Filter first, then search within results

**Filtering + Indirect Connections**: Maintain relationship context when nodes are hidden

## Next Steps

- [Color Rules](color-rules) - Combine with filtering
- [Graph Views](graph-views) - Apply filters in different modes
