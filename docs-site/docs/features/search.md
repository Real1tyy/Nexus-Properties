---
sidebar_position: 9
---

# Search

Real-time search by filename and path. Highlights matches, dims non-matches.

## Usage

**Show search bar**: Command "Toggle Graph Search" or [enable by default](../configuration#show-search-bar-by-default)

**Search**: Type query, results update instantly

**Clear**: Delete all text or click × button

## Search Behavior

**Case-insensitive**: `project` matches "Project", "PROJECT", "project"

**Partial matching**: `proj` matches "**Proj**ect Overview"

**Searches**:
- File names (without extension)
- File paths (full path including folders)

**Does NOT search**:
- Frontmatter properties (use [filtering](filtering) instead)
- Note content
- Tags (unless in filename)

## Visual Feedback

**Matching nodes**: Normal opacity and colors
**Non-matching nodes**: Dimmed to ~30% opacity
**Source node**: Always fully visible

## Examples

```
Project          → Matches "Project Overview.md", "Main Project.md"
Work/            → Matches "Work/Project A.md", "Work/Tasks/Task 1.md"
2024-01          → Matches "2024-01-15 Meeting.md", "Jan 2024 Overview.md"
task             → Matches "Task 1.md", "Important Task.md"
```

## Combining Features

**Search + Filtering**: Filter by properties, search by name
**Search + View Modes**: Works in all modes
**Search + Zoom Mode**: Search to find, click to preview

## Limitations

- No content search (use Obsidian's built-in search)
- No property search (use [filtering](filtering))
- No fuzzy matching (requires substring match)
- No regex

## Next Steps

- [Filtering](filtering) - Property-based search
- [Zoom Mode](zoom-mode) - Preview found nodes
- [Color Rules](color-rules) - Visual categories
