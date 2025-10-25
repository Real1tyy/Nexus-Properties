---
sidebar_position: 7
---

# Zoom Mode

Zoom Mode allows you to preview any note directly within the graph view without leaving the visualization. Click any node to enter zoom mode and see its content inline.

## Entering Zoom Mode

### Click a Node

**From normal view**:
1. Click any node in the graph
2. Zoom mode activates
3. Preview panel appears at bottom
4. Node is highlighted with focus indicator

**Already in zoom mode**:
1. Click a different node
2. Focus switches to that node
3. Preview updates instantly
4. No need to exit and re-enter

### Focus Indicator

The focused node is highlighted with:
- **Thicker border** (3px)
- **Bright blue border** (`#2563eb`)
- **Higher z-index** (appears above other nodes)

## Exiting Zoom Mode

Three ways to exit zoom mode:

1. **Click focused node again** - Click the same node that's currently focused
2. **Command**: "Toggle Focus Content" or "Toggle Focus Frontmatter"
3. **Click outside** the graph and preview area

## Zoom Preview Panel

The preview panel appears at the bottom of the graph view and contains two sections:

### Frontmatter Section

Shows the node's frontmatter properties in a formatted view.

**Features**:
- **Property names** on the left
- **Property values** on the right
- **Wiki links** are clickable
- **Arrays** shown as bulleted lists
- **Objects** shown as nested properties
- **Empty properties** hidden (if setting enabled)
- **Underscore properties** hidden (if setting enabled)

**Height**: Controlled by [Zoom Preview Frontmatter Height](../configuration#zoom-preview-frontmatter-height)

### Content Section

Shows the note's markdown content (body text, excluding frontmatter).

**Features**:
- **Rendered markdown** - Headings, lists, etc. are formatted
- **Clickable links** - Wiki links and external links work
- **Scrollable** - For long content
- **Readable formatting** - Proper line spacing and typography

**Height**: Controlled by [Zoom Preview Height](../configuration#zoom-preview-height)

## Toggling Visibility

Each section (frontmatter and content) can be toggled independently.

### Eye Icons

Two eye icons appear in the zoom preview header:

- **Left icon**: Toggle frontmatter visibility
- **Right icon**: Toggle content visibility

**Click to toggle**:
- **Open eye** (👁️) - Section is visible
- **Closed eye** (👁️‍🗨️) - Section is hidden

### Default Visibility

Configure default visibility in settings:

**[Zoom: Hide Frontmatter by Default](../configuration#zoom-hide-frontmatter-by-default)**
- `true` - Frontmatter starts hidden
- `false` - Frontmatter starts visible (default)

**[Zoom: Hide Content by Default](../configuration#zoom-hide-content-by-default)**
- `true` - Content starts hidden
- `false` - Content starts visible (default)

### Commands

You can also toggle visibility with commands:

**"Toggle Focus Content (Zoom Preview)"**
- Shows/hides the content section
- Only works when in zoom mode

**"Toggle Focus Frontmatter (Zoom Preview)"**
- Shows/hides the frontmatter section
- Only works when in zoom mode

:::tip Hotkeys
Assign hotkeys to these commands for quick toggling (Settings → Hotkeys → Nexus Properties)
:::

## Navigating in Zoom Mode

### Clicking Links

**Wiki links** in frontmatter or content are clickable:

**In frontmatter**:
- Click a wiki link
- Graph switches focus to that node
- Preview updates to show the linked note
- Stays in zoom mode

**In content**:
- Click a wiki link
- Same behavior as frontmatter links
- Navigate through your notes without leaving zoom mode

**External links**:
- Open in browser
- Zoom mode stays active

### Clicking Other Nodes

While in zoom mode:
1. Click any other node in the graph
2. Focus immediately switches
3. Preview updates instantly
4. No need to exit/re-enter

### Clicking Edges

**Click an edge** (line between nodes):
1. Focus switches to the target node
2. Preview updates
3. Stays in zoom mode

Useful for quickly navigating relationships.

## Zoom Preview Configuration

### Panel Height

Control how much space the preview takes:

**Zoom Preview Height** (120px - 700px, default 280px):
- Smaller: More graph visible, less content shown
- Larger: Less graph visible, more content shown
- Adjust based on your screen size and workflow

**Zoom Preview Frontmatter Height** (50px - 300px, default 90px):
- Smaller: Fewer properties visible, more scrolling
- Larger: More properties visible, takes more space
- Adjust based on typical frontmatter size

[Configure in settings](../configuration#zoom-preview-height)

### Property Display

**Hide Empty Properties**:
- Enabled: Empty/null values don't show in preview
- Disabled: All properties shown, even if empty

**Hide Underscore Properties**:
- Enabled: Properties starting with `_` are hidden
- Disabled: All properties shown, including internal ones

[Configure in settings](../configuration#property-display)

## Use Cases

### Quick Reference

**Scenario**: Reviewing project tasks

1. View project in "Hierarchical" mode
2. Click each task to preview details
3. Check status, notes, links
4. No need to open each file

**Benefit**: Fast overview of entire project

### Note Navigation

**Scenario**: Following a trail of connected ideas

1. Start at a concept note
2. Enter zoom mode
3. Click links in frontmatter/content
4. Navigate through related concepts
5. Stay in graph context

**Benefit**: Visual navigation path, never lose context

### Content Review

**Scenario**: Reviewing notes for completeness

1. Filter to show specific notes
2. Enter zoom mode on first note
3. Review frontmatter and content
4. Click next node to continue
5. Toggle sections as needed

**Benefit**: Efficient batch review

### Relationship Exploration

**Scenario**: Understanding connections

1. View in "All Related" mode
2. Click each node to preview
3. See what properties they share
4. Understand why they're related
5. Follow links to dig deeper

**Benefit**: Discover patterns and connections

## Tips & Tricks

### Keyboard Navigation

1. **Assign hotkeys** to toggle commands:
   - Toggle Focus Content
   - Toggle Focus Frontmatter
2. **Navigate with mouse**, toggle with keyboard
3. **Efficient workflow** without reaching for mouse

### Two-Panel Workflow

1. **Keep zoom mode open** for preview
2. **Double-click nodes** to open in new tab
3. **Edit in tab**, preview in graph
4. **Best of both worlds**

### Hide Distractions

1. **Hide frontmatter** if you only care about content
2. **Hide content** if you only care about properties
3. **Toggle as needed** for focused viewing

### Size Optimization

**Small screens**:
- Reduce preview height (180-220px)
- Reduce frontmatter height (60-80px)
- More graph space

**Large screens**:
- Increase preview height (400-500px)
- Increase frontmatter height (150-200px)
- See more at once

### Performance

**For large files**:
- Hide content section when not needed
- Reduces rendering overhead
- Faster node switching

## Troubleshooting

### Preview Not Showing

**Check zoom mode active**:
- Look for highlighted node (blue border)
- Click node to enter zoom mode

**Check panel height**:
- May be set too small
- Increase in settings
- Minimum 120px

**Check file exists**:
- Deleted files can't be previewed
- Orphaned nodes have no content

### Content Not Rendering

**Check markdown syntax**:
- Invalid markdown may not render
- Check file directly in Obsidian

**Check file not empty**:
- Empty files show blank preview
- Check that content exists

**Check visibility toggle**:
- Eye icon may be closed
- Click to show content section

### Links Not Clickable

**Check link format**:
- Must be valid wiki links `[[note]]`
- Or valid markdown links `[text](url)`

**Check link target exists**:
- Broken links may not be clickable
- Verify target file exists

**Check not in edit mode**:
- Links only clickable in preview mode
- Zoom mode is always preview mode

### Slow Performance

**Large files**:
- Hide content section when not needed
- Or reduce preview height

**Many properties**:
- Enable "Hide empty properties"
- Hide frontmatter when not needed

**Frequent switching**:
- Normal - rendering takes time
- Consider increasing animation duration for smoother feel

## Next Steps

- [Learn about Tooltips](tooltips) for hover-based previews
- [Use Context Menus](context-menus) for quick actions
- [Configure Zoom Settings](../configuration#zoom-preview-height)
- [Explore Graph Views](graph-views) in zoom mode
