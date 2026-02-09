---
sidebar_position: 5
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# MOC View

<div className="video-container" style={{"textAlign": "center", "marginBottom": "2em"}}>
  <video
    controls
    autoPlay
    loop
    muted
    playsInline
    style={{"width": "100%", "maxWidth": "800px", "borderRadius": "8px"}}
  >
    <source src={useBaseUrl("/video/Bases.webm")} type="video/webm" />
    Your browser does not support the video tag.
  </video>
</div>

Map of Content (MOC) view renders your hierarchy as an interactive collapsible tree with clickable wiki links. Perfect for exploring your knowledge structure at a glance.

## MOC Content Hierarchy

Use bullet list structures in your notes as a hierarchy source instead of frontmatter properties.

### What is MOC Content Hierarchy?

Traditionally, Nexus Properties reads relationships from frontmatter properties (`Parent`, `Children`, `Related`). MOC Content mode provides an alternative: **parse bullet lists with wiki links** directly from your note's markdown body.

This is ideal for:
- **Existing MOC files**: Notes that already organize knowledge via nested bullet lists
- **Quick hierarchy authoring**: Build hierarchies visually in markdown without editing frontmatter
- **Top-down organization**: Start with a high-level overview file and nest topics underneath

### Example MOC File

```markdown
# My Hobbies

- [[Reading]]
    - [[Fiction]]
        - [[Mystery Novels]]
        - [[Science Fiction]]
    - [[Non-Fiction]]
        - [[History Books]]
- [[Sports]]
    - [[Running]]
    - [[Swimming]]
```

When viewing this file with MOC Content mode enabled:
- **Children view** shows: `Reading`, `Sports`
- **All Children view** shows all 7 descendant notes recursively

### Enabling MOC Content Mode

**Step 1: Enable MOC Content Reading**

Settings → General → **Enable MOC content reading** (default: enabled)

This allows the plugin to detect and parse MOC structures in your notes.

**Step 2: Switch Hierarchy Source**

Two ways to switch:

1. **Quick Toggle Button**: When viewing a file with valid MOC content (3+ links, 2+ levels), a button appears next to the view toggle. Click to switch between "Properties" and "MOC Content".

2. **Settings**: Settings → General → **Hierarchy Source** → Choose "MOC Content"

### Valid MOC Detection

The plugin automatically detects valid MOC content when:
- The file contains **3 or more wiki links** in bullet lists
- At least one bullet has **nested children** (2+ levels of indentation)

Files that don't meet these criteria won't show the hierarchy source toggle button.

### Supported Bullet Format

```markdown
- [[Note 1]]
    - [[Child 1]]
- [[Note 2]]
	- [[Child with tab indent]]
    - [[Child with space indent]]
```

The parser handles both tabs and spaces for indentation. Each bullet line must contain at least one wiki link; the first link becomes the node identity.

### Frontmatter Safety

The MOC parser **skips frontmatter entirely**. Wiki links in your YAML properties are not parsed as hierarchy:

```markdown
---
parent: "[[Some Parent]]"  # NOT parsed as MOC hierarchy
related: ["[[Related 1]]", "[[Related 2]]"]  # NOT parsed
---

# My Note

- [[Actual Child 1]]  # Parsed as MOC hierarchy
- [[Actual Child 2]]  # Parsed as MOC hierarchy
```

### Bases View Behavior

When MOC Content mode is active:

| View | Behavior |
|------|----------|
| **Children** | Direct children only (level 0 descendants from bullet list) |
| **All Children** | All descendants recursively |
| Parent | *Hidden* (not applicable) |
| Related | *Hidden* (not applicable) |
| All Parents | *Hidden* (not applicable) |
| All Related | *Hidden* (not applicable) |

### Graph View Behavior

When MOC Content mode is active:
- **Related view**: Hidden
- **Start from Current File**: Hidden
- Only hierarchical views (showing parent-child relationships) are available

### Statistics Display

The header statistics adapt to MOC Content mode:
- Only **Children** and **All Children** counts are shown
- Parent and Related statistics are hidden

### Switching Between Modes

You can freely switch between "Properties" and "MOC Content" modes:
- The plugin remembers your preference per session
- Each mode shows the same file's hierarchy differently
- No data is modified when switching—it's purely a display mode

### Limitations

- **Read-only**: MOC Content mode only reads hierarchies; creating nodes still uses frontmatter properties
- **Single file scope**: The hierarchy is parsed from the current file only
- **First link wins**: If a bullet has multiple wiki links, only the first is used as the node identity
- **No bidirectional sync**: Unlike frontmatter properties, MOC content doesn't trigger bidirectional updates

---

## Opening MOC View

The view switcher cycles through three modes: **Graph → Bases → MOC**

- **Toggle button**: Click "Switch to MOC" in the view header
- **Command**: "Toggle View Mode (Graph/Bases/MOC)"

## Tree Structure

MOC displays notes in a hierarchical outline format:

```
- [[Current Note]]
    - [[Child 1]]
        - [[Grandchild 1]]
        - [[Grandchild 2]]
    - [[Child 2]]
```

Each level is indented to show parent-child relationships clearly. Items with children have a collapse/expand chevron.

## Root Mode Toggle

Switch between two root modes using the toggle button in the toolbar:

### Current (Default)

Tree starts from the active file as root, showing only its descendants.

```
- [[Active File]] ← root
    - [[Child 1]]
    - [[Child 2]]
```

### Top Parent

Traverses upward to find the topmost ancestor, then renders the full tree with your current file highlighted.

```
- [[Topmost Ancestor]] ← root (traversed upward)
    - [[Intermediate Parent]]
        - [[Active File]] ← highlighted
            - [[Child 1]]
            - [[Child 2]]
```

This uses the same traversal algorithm as the Graph view, respecting the **Prioritize Parent** setting for notes with multiple parents.

## Navigation

### Click

Click any note to open it in the current pane.

### Ctrl+Click (Cmd+Click on Mac)

Open note in a new tab.

### Expand/Collapse

- **Chevron**: Click to toggle individual branches
- **Expand All**: Show all nested children
- **Collapse All**: Hide all children

## Display Properties

Show frontmatter properties next to each note in the tree. Configure in **Settings → Bases → Display properties**.

Enter a comma-separated list of property names (e.g., `status, priority, tags`). Properties containing wiki links are rendered as clickable links.

```
- [[Project A]]                    [Active] [High]
    - [[Task 1]]                   [Done]
    - [[Task 2]]                   [In Progress]
```

The properties appear to the right of each note name and scroll horizontally if they overflow.

## Visual Indicators

- **Current file**: Highlighted with accent background color (in Top Parent mode)
- **Depth styling**: Root items are larger/bolder, deeper items are smaller/muted
- **Vertical lines**: Connect parent to children visually
- **Property badges**: Frontmatter values shown as compact badges

## Cycle Detection

The view handles circular relationships gracefully. If a note appears in its own ancestry chain, it won't cause infinite loops.

## Use Cases

- **Map of Content**: Create visual outlines of topic hierarchies
- **Project Overview**: See all tasks/subtasks in a project
- **Knowledge Exploration**: Navigate through related concepts

## Next Steps

- [Graph Views](graph-views) - Visual network exploration
- [Bases View](bases-view) - List-based relationship view
- [Bidirectional Sync](bidirectional-sync) - Relationship management
