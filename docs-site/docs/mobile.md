---
sidebar_position: 4
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Mobile Support

Nexus Properties is fully optimized for mobile devices, providing a responsive and touch-friendly experience on phones.

## Overview

On screens smaller than 600px width, the plugin automatically switches to a mobile-optimized layout that maximizes screen space while maintaining full functionality.

## What's Different on Mobile?

### Graph View

#### Header & Controls
- **No Title Bar**: The graph title is hidden to save vertical space
- **Single Row Layout**: All controls (Related, All, Current) fit in one compact row
- **Shorter Labels**:
  - "Render Related" becomes "Related"
  - "All Related" becomes "All"
  - "Current File Only" becomes "Current"
- **Filter Preset Selector**: Moved to the header controls row for easy access

#### Search & Filter
- **Combined Row**: Search input and filter input share a single row instead of two separate rows
- **Smaller Inputs**: Reduced size to fit comfortably on mobile screens
- **No Zoom Indicator**: Zoom percentage hidden to reduce visual clutter

#### Zoom Preview
When you [zoom into a node](features/zoom-mode) on mobile:
- **Auto-Hide Controls**: Header, search bar, and filter bar automatically hide to maximize preview space
- **Compact Layout**: Everything is sized smaller to show more content
- **Frontmatter Grid**: Properties displayed in a tight grid (configurable width, default shows ~4 per row)
- **Minimal Padding**: Content sections use minimal padding to display more text at once
- **Touch-Optimized Toggles**: Hide Frontmatter, Hide Content, and Exit Zoom buttons sized for easy tapping

### Bases View
- **Compact Mobile Layout**: Buttons are smaller on mobile to fit comfortably on small screens

#### View Switcher
- **Smaller Toggle**: The "Switch to Graph View" / "Switch to Bases View" button is 30% smaller

### Touch Interactions

#### Node Interactions
- **Single Tap**: Opens zoom preview (same as desktop click)
- **Long Press**: Opens [context menu](features/context-menus) (same as desktop right-click)
  - Hold for ~500ms to trigger

#### Gesture Support
- **Pan**: Drag with one finger to move the graph
- **Pinch Zoom**: Two-finger pinch to zoom in/out (standard Cytoscape behavior)

## Mobile Settings

### Configurable Mobile Frontmatter Width

**Location**: Settings → Graph → Mobile → Mobile frontmatter property width

Adjust how wide frontmatter properties appear in zoom preview on mobile:
- **50-80px**: Very compact, fits 5-7 properties per row
- **100px** (default): Balanced layout, fits ~4 properties per row
- **120-150px**: Spacious, fits 2-3 properties per row
- **200-300px**: Extra wide, fits 1-2 properties per row

Lower values show more properties at once but may truncate long property names. Higher values give more space for each property but show fewer at once.

## Feedback

If you encounter issues on mobile, [open an issue](https://github.com/Real1tyy/Nexus-Properties/issues) and include your device, screen size, Obsidian version, and mobile OS.

## Next Steps

- [Graph Views](features/graph-views) — Desktop graph interaction reference
- [Zoom Mode](features/zoom-mode) — Zoom preview details
- [Context Menus](features/context-menus) — All available context menu actions
- [Configuration](configuration) — Settings reference
