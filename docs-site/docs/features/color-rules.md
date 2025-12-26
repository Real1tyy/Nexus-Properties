---
sidebar_position: 5
---

# Color Rules

Apply conditional colors to nodes based on frontmatter properties using JavaScript expressions.

## How It Works

**Evaluation**: Rules evaluated top to bottom, first match wins
**Expression context**: Access frontmatter properties directly by name
**Default color**: Applied if no rules match ([configure](../configuration))

## Creating Rules

**Access**: Settings → Nexus Properties → Node colors → Add Rule

**Components**:
- **Expression**: JavaScript returning boolean (e.g., `status === 'complete'`)
- **Color**: Hex (`#3b82f6`), HSL (`hsl(200, 70%, 50%)`), or named (`steelblue`)
- **Enabled**: Toggle on/off
- **Order**: ↑/↓ buttons to reorder

## Expression Syntax

```javascript
// Simple
status === 'complete'
priority === 'high'

// Numeric
progress > 50
count <= 10

// Boolean
completed === true
!archived

// Arrays
Array.isArray(tags) && tags.includes('important')
tags.length > 3

// Strings
title.includes('Project')
title.startsWith('DRAFT')

// Complex
status === 'complete' && priority === 'high'
type === 'project' || type === 'task'
```

## Example Rules

```javascript
// Status colors
status === 'complete'  → #22c55e (green)
status === 'in-progress'  → #f59e0b (orange)
status === 'pending'  → #ef4444 (red)

// Type colors
type === 'project'  → #3b82f6 (blue)
type === 'task'  → #10b981 (green)
type === 'note'  → #6366f1 (purple)

// Priority
priority === 'urgent'  → #dc2626 (dark red)
priority === 'high'  → #f59e0b (orange)
priority === 'low'  → #6b7280 (gray)

// Tags
Array.isArray(tags) && tags.includes('important')  → #ef4444 (red)
```

## Rule Order

**First match wins**. Place specific rules above general rules.

**Example**:
1. `status === 'urgent'` → Red (specific)
2. `status !== ''` → Blue (general)

Result: Urgent notes are red, all other notes with status are blue.

## Managing Rules

**Enable/Disable**: Toggle checkbox (useful for testing)
**Reorder**: Use ↑/↓ buttons
**Delete**: Click × button (permanent, no undo)

## Common Patterns

**GTD**: `status === 'next'` (green), `status === 'waiting'` (orange), `status === 'done'` (gray)
**Project lifecycle**: `phase === 'planning'` (yellow), `phase === 'active'` (green), `phase === 'complete'` (blue)
**Knowledge maturity**: `maturity === 'seedling'` (light green), `maturity === 'evergreen'` (dark green)

## Next Steps

- [Filtering](filtering) - Combine colors with filtering
- [Tooltips](tooltips) - Verify property values
- [Graph Views](graph-views) - See colored nodes in action
