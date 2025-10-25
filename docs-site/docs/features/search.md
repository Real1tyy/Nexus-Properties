---
sidebar_position: 9
---

# Graph Search

Quickly find and highlight nodes in the relationship graph with real-time search. The search feature helps you locate specific notes in large networks without manual scanning.

## Using Search

### Opening the Search Bar

Three ways to show/hide the search bar:

1. **Command**: "Toggle Graph Search"
2. **Default visible**: Enable in [settings](../configuration#show-search-bar-by-default)
3. **Hotkey**: Assign a custom hotkey (Settings → Hotkeys)

### Search Input

The search bar appears at the top of the graph view:

1. **Click the search input** or use the command to focus it
2. **Type your search query**
3. **Results update in real-time** as you type
4. **Matching nodes are highlighted**
5. **Non-matching nodes are dimmed**

### Clearing Search

To clear the search and show all nodes normally:

1. **Delete all text** from the search input
2. Or **click the × button** (if present)
3. All nodes return to normal visibility

## Search Behavior

### Real-Time Matching

Search updates **immediately as you type**:
- No need to press Enter
- Results update with each keystroke
- Instant feedback

### Case-Insensitive

Search is **not case-sensitive**:
- `project` matches "Project", "PROJECT", "project"
- `TODO` matches "todo", "Todo", "TODO"

### Partial Matching

Search matches **partial strings**:
- `proj` matches "**Proj**ect Overview"
- `task` matches "Important **Task**"
- `2024` matches "Notes **2024**"

### What Gets Searched

Search looks at:
- **File names** (without extension)
- **File paths** (full path including folders)

Search does **not** look at:
- Frontmatter properties
- Note content
- Tags (unless in filename)

:::tip Searching Properties
Use [filtering](filtering) to search based on frontmatter properties. Search is for finding notes by name/path only.
:::

## Visual Feedback

### Matching Nodes

Nodes that match the search query:
- **Normal opacity** (fully visible)
- **Normal colors** (color rules still apply)
- **Stand out** from non-matching nodes

### Non-Matching Nodes

Nodes that don't match:
- **Reduced opacity** (dimmed to ~30%)
- **Colors desaturated**
- **Still visible** but clearly not matches

### Source Node

The source node (currently viewed file):
- **Always fully visible** even if doesn't match
- **Never dimmed** by search
- **Maintains context**

## Example Searches

### Find by Name

**Query**: `Project`

**Matches**:
- "**Project** Overview.md"
- "Main **Project**.md"
- "**project**-notes.md"

### Find by Folder

**Query**: `Work/`

**Matches**:
- "**Work**/Project A.md"
- "**Work**/Tasks/Task 1.md"
- "**Work**/Notes/Meeting.md"

### Find by Date

**Query**: `2024-01`

**Matches**:
- "**2024-01**-15 Meeting.md"
- "**2024-01**-20 Report.md"
- "Jan **2024** Overview.md"

### Find by Type

**Query**: `task`

**Matches**:
- "**Task** 1.md"
- "Important **Task**.md"
- "**task**-list.md"

### Find by Keyword

**Query**: `report`

**Matches**:
- "Quarterly **Report**.md"
- "**Report** Template.md"
- "meeting-**report**.md"

## Combining Search with Other Features

### Search + Filtering

Use both together for precise targeting:

1. **Apply filter** to show only specific types (e.g., `type === 'project'`)
2. **Use search** to find specific project by name
3. **Result**: Only projects shown, matching search are highlighted

**Benefit**: Narrow down large graphs efficiently

### Search + View Modes

Search works in all view modes:

**Hierarchical Mode**:
- Search within entire tree
- Matching nodes and their relationships stay highlighted
- Easy to locate specific branches

**Related Mode**:
- Search among related nodes
- Quickly find specific connections
- Identify relevant relationships

**All Related Mode**:
- Search within constellations
- Locate nodes in large networks
- Track down indirect connections

### Search + Color Rules

1. **Color nodes** by category
2. **Search** for specific names
3. **Visual categories** + name matching
4. **Double benefit**: See type and locate name

### Search + Zoom Mode

Workflow:
1. **Search** to find node
2. **Click matching node** to enter zoom mode
3. **Preview** the found note
4. **Verify** it's what you were looking for

## Use Cases

### Finding a Specific Note

**Scenario**: Locate "Q4 Report" in large project

1. Open graph for project
2. Open search
3. Type "Q4"
4. "Q4 Report" node highlighted
5. Click to preview or navigate

**Benefit**: No manual scanning of hundreds of nodes

### Locating Date-Based Notes

**Scenario**: Find notes from January 2024

1. Open graph
2. Search "2024-01"
3. All January notes highlighted
4. Review each quickly

**Benefit**: Date-based filtering without custom properties

### Exploring Folder Structure

**Scenario**: See all "Work" folder notes

1. Search "Work/"
2. All nodes in Work folder highlighted
3. Visualize work-related network
4. Ignore personal notes

**Benefit**: Path-based exploration

### Quick Navigation

**Scenario**: Jump to specific task in hierarchy

1. View project hierarchy
2. Search "Task 12"
3. Node highlighted in tree
4. Click to navigate

**Benefit**: Fast navigation in deep hierarchies

## Search Tips

### Use Specific Terms

**Better**: `Project-Alpha`
**Less specific**: `Project`

More specific = fewer matches = easier to find

### Use Path Prefixes

**Find in folder**: `Work/Projects/`
**Find in subfolder**: `Projects/2024/`

Paths help narrow down location

### Use Dates

**Find recent**: `2024-01`
**Find old**: `2023`

Date-based search for temporal notes

### Incremental Refinement

Start broad, then refine:
1. Type `task` (many matches)
2. Add `task 1` (fewer matches)
3. Add `task 12` (specific match)

**Benefit**: See results narrow down in real-time

## Limitations

### No Content Search

Search **does not** look at note content:
- Only searches filename and path
- To search content, use Obsidian's built-in search

### No Property Search

Search **does not** look at frontmatter:
- Use [filtering](filtering) for property-based search
- Example: `status === 'active'` filter instead

### No Fuzzy Matching

Search requires **substring match**:
- `task` matches "**task**", "**Task**", "my**task**"
- `tsk` does **not** match "task" (no fuzzy match)

### No Regex

Search is **simple substring matching only**:
- No regular expressions
- No wildcards
- No special patterns

## Performance

### Real-Time Updates

- Search evaluates on every keystroke
- Performance is excellent even with 500+ nodes
- No noticeable lag

### Large Graphs

With 1000+ nodes:
- Search still performs well
- Dimming effect may be slow on very large graphs
- Consider using filtering to reduce node count first

## Troubleshooting

### Search Not Working

**Check search bar visible**:
- Use "Toggle Graph Search" command
- Or enable default visibility in settings

**Check typing in correct field**:
- Focus should be on search input
- Click input to ensure focus

**Check spelling**:
- Case-insensitive but must be correct spelling
- Try partial match (first few letters)

### No Matches Found

**Check filename**:
- Search only searches filename/path, not content
- Verify the filename contains your search term

**Check not filtered out**:
- If filtering is active, node may be hidden
- Clear filters to see all nodes

**Check in view**:
- Node must be in current view mode
- Switch view modes if needed

### Matches Not Highlighted

**Check opacity**:
- Matching nodes should be full opacity
- Non-matching should be dimmed
- If not, may be a visual issue

**Check search is active**:
- Text must be in search input
- Clear and retype if needed

### Too Many Matches

**Refine search**:
- Add more characters for specificity
- Add path prefix: `folder/filename`
- Add date or unique identifier

**Use filtering**:
- Combine with filters to narrow down
- Example: Filter by type, then search by name

## Accessibility

**Keyboard accessible**:
- Focus search input with command/hotkey
- Type to search
- Tab to navigate out

**Screen reader**:
- Search input is labeled
- Match count (if shown) is announced
- Dimmed nodes may not be announced as hidden

## Tips & Best Practices

1. **Start typing as soon as graph loads** - Faster than scrolling
2. **Use unique parts of filenames** - Dates, IDs, specific terms
3. **Combine with filtering** for powerful targeting
4. **Clear search when done** to see full graph
5. **Assign hotkey** for quick access
6. **Use path prefixes** to narrow by location
7. **Remember: filename only** - content search requires filtering

## Next Steps

- [Learn about Filtering](filtering) for property-based search
- [Use Zoom Mode](zoom-mode) to preview found nodes
- [Apply Color Rules](color-rules) for visual categories
- [Configure Search Settings](../configuration#show-search-bar-by-default)
