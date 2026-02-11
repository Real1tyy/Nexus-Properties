---
sidebar_position: 1
slug: /
---

import useBaseUrl from "@docusaurus/useBaseUrl";

# Nexus Properties

**Nexus Properties** is a powerful Obsidian plugin that automatically manages bidirectional property relationships and provides an interactive relationship graph visualization. It helps you build and navigate complex knowledge networks by maintaining consistent parent-child and related relationships across your vault.

## Preview

<div style={{"display": "flex", "flexWrap": "wrap", "gap": "1em", "justifyContent": "center", "marginBottom": "1em"}}>
  <video controls autoPlay loop muted playsInline style={{"flex": "1 1 45%", "minWidth": "300px", "maxWidth": "50%", "borderRadius": "8px"}}>
    <source src={useBaseUrl("/video/BasesNEW.webm")} type="video/webm" />
  </video>
  <video controls autoPlay loop muted playsInline style={{"flex": "1 1 45%", "minWidth": "300px", "maxWidth": "50%", "borderRadius": "8px"}}>
    <source src={useBaseUrl("/video/MultiRow.webm")} type="video/webm" />
  </video>
</div>

<div style={{"display": "flex", "flexWrap": "wrap", "gap": "1em", "justifyContent": "center", "marginBottom": "2em"}}>
  <video controls autoPlay loop muted playsInline style={{"flex": "1 1 45%", "minWidth": "300px", "maxWidth": "50%", "borderRadius": "8px"}}>
    <source src={useBaseUrl("/video/Depth.webm")} type="video/webm" />
  </video>
  <video controls autoPlay loop muted playsInline style={{"flex": "1 1 45%", "minWidth": "300px", "maxWidth": "50%", "borderRadius": "8px"}}>
    <source src={useBaseUrl("/video/AllRelatedNEW.webm")} type="video/webm" />
  </video>
</div>

## What is Nexus Properties?

Nexus Properties transforms your Obsidian vault into an interconnected knowledge graph by:

- **Syncing bidirectional relationships** — Set a child, the parent updates automatically
- **Computing recursive relationships** — Visualize entire hierarchies and related constellations
- **Providing interactive views** — Graph, Bases, and MOC views for navigating your network
- **Maintaining consistency** — Automatic cleanup on file deletion, rename, or relationship change

## Who is this for?

Built for **system builders** with large, long-lived vaults who think in hierarchies and networks.

**Good fit if you:**
- Manage complex knowledge systems with hundreds or thousands of notes
- Want structured workflows with consistent, auto-synced metadata
- Value visual navigation of your knowledge structure

**Not ideal if you:**
- Prefer minimal notes without frontmatter
- Don't need structured parent-child or related relationships

## Key Features

### 🔗 Bidirectional Relationship Management

Set relationships in one direction, and Nexus Properties automatically updates the reverse relationship. Define parent-child hierarchies and related connections that stay synchronized across your entire vault.

[Learn more about Bidirectional Sync →](features/bidirectional-sync)

### 📊 Interactive Relationship Graph

Visualize your knowledge network with multiple view modes:
- **Hierarchical** - See parent-child trees
- **Related** - View direct related connections
- **All Related** - Explore entire constellations of related notes
- **Start from Current** - Focus on specific nodes
- **Fully Mobile Optimized** - Complete touch support with responsive layouts

[Learn more about Graph Views →](features/graph-views) | [Mobile Support →](mobile)

### 🗺️ MOC (Map of Content) View

Render your hierarchy as a collapsible tree outline with clickable wiki links:
- **Current or Top Parent** - Start from active file or traverse to topmost ancestor
- **Expand/Collapse** - Navigate deep hierarchies with ease
- **MOC Content Hierarchy** - Use bullet lists with wiki links as a hierarchy source instead of frontmatter properties

[Learn more about MOC View →](features/moc-view)

### 🎨 Customizable Node Colors

Apply conditional colors to nodes based on frontmatter properties. Create visual categories using JavaScript expressions to instantly identify different types of notes.

[Learn more about Color Rules →](features/color-rules)

### 🔍 Powerful Filtering

Filter your graph using JavaScript expressions. Show only nodes that match specific criteria to focus on relevant parts of your knowledge network.

[Learn more about Filtering →](features/filtering)

### 🔬 Zoom Mode

Enter zoom mode to see detailed previews of any note directly in the graph view. Toggle visibility of frontmatter and content for focused reading.

[Learn more about Zoom Mode →](features/zoom-mode)

### ⚡ Quick Node Creation

Create parent, child, or related nodes instantly from the command palette. New nodes automatically inherit properties and establish bidirectional relationships.

[Learn more about Node Creation →](features/node-creation)

## Getting Started

1. [Install the plugin](installation)
2. [Follow the quickstart guide](quickstart)
3. [Configure your settings](configuration)
4. [Set up hotkeys](hotkeys) for quick access
5. [Watch video tutorials](videos) for a visual walkthrough

## Support & Community

- **Issues & Bug Reports**: [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
- **Sponsor Development**: [Support My Work](https://matejvavroproductivity.com/support/)

## Credits

Built with [Cytoscape.js](https://js.cytoscape.org/) for graph rendering, including hierarchical layouts (via Dagre) and constellation network views.

## License

Nexus Properties is open source software licensed under the [MIT License](https://github.com/Real1tyy/Nexus-Properties/blob/main/LICENSE).
