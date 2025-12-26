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

## Example Rules

```javascript
// Simple equality
status === 'complete'  → #22c55e (green)
status === 'in-progress'  → #f59e0b (orange)
status === 'pending'  → #ef4444 (red)

// Type-based
type === 'project'  → #3b82f6 (blue)
type === 'task'  → #10b981 (green)
type === 'note'  → #6366f1 (purple)

// Numeric comparison
progress > 50  → #22c55e (green)
priority >= 8  → #dc2626 (red)

// Boolean
completed === true  → #9ca3af (gray)
!archived  → #22c55e (green)

// Arrays
Array.isArray(tags) && tags.includes('important')  → #ef4444 (red)
tags.length > 3  → #f59e0b (orange)

// Strings
title.includes('Project')  → #3b82f6 (blue)
title.startsWith('DRAFT')  → #eab308 (yellow)

// Complex conditions
status === 'complete' && priority === 'high'  → #059669 (dark green)
type === 'project' || type === 'task'  → #3b82f6 (blue)
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

## Next Steps

- [Filtering](filtering) - Combine colors with filtering
- [Tooltips](tooltips) - Verify property values
- [Graph Views](graph-views) - See colored nodes in action
