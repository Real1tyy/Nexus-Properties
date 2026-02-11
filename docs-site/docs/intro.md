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

- **Automatically syncing bidirectional relationships** - When you set a child, the parent is automatically updated
- **Computing recursive relationships** - Visualize entire hierarchies and related constellations
- **Providing an interactive graph view** - Navigate your knowledge network visually
- **Maintaining consistency** - Automatic cleanup when files are deleted or relationships change

## Who is this for?

Nexus Properties is built for **system builders** with large, long-lived vaults who want structured PKM workflows and think in hierarchies and networks.

**Perfect for you if:**
- You manage complex knowledge systems with hundreds or thousands of notes
- You think in hierarchies, relationships, and networks
- You want structured workflows with consistent metadata
- You need automatic synchronization to maintain consistency
- You value visual navigation of your knowledge structure

**Probably not for you if:**
- You prefer minimal notes with no metadata
- You want a lightweight, simple note-taking experience
- You don't use frontmatter or structured properties
- You prefer manual relationship management

If you're building a structured knowledge system, Nexus Properties will feel like a natural extension of your workflow. If you prefer minimal, unstructured notes, this will likely feel like overkill — and that's intentional.

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

## Mobile Support

Nexus Properties is **fully optimized for mobile devices** with touch-friendly interfaces, responsive layouts, and gesture support. The plugin has been tested on phones to ensure a smooth experience on all screen sizes.

[Learn more about Mobile Support →](mobile)

## Getting Started

Ready to start building your knowledge network?

1. [Install the plugin](installation)
2. [Watch the full video tutorial](videos) 🎬
3. [Set up hotkeys](hotkeys) for quick access
4. [Configure your settings](configuration)
5. [Follow the quickstart guide](quickstart)

## Support & Community

- **Issues & Bug Reports**: [GitHub Issues](https://github.com/Real1tyy/Nexus-Properties/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/Real1tyy/Nexus-Properties/discussions)
- **Sponsor Development**: [Support My Work](https://matejvavroproductivity.com/support/)

## Credits & Acknowledgments

Nexus Properties is built using [Cytoscape.js](https://js.cytoscape.org/), a powerful and flexible graph visualization library. Cytoscape.js provides the robust graph rendering engine that powers Nexus Properties' interactive visualizations, including the hierarchical layouts (via the Dagre extension) and constellation-based network views.

## License

Nexus Properties is open source software licensed under the [MIT License](https://github.com/Real1tyy/Nexus-Properties/blob/main/LICENSE).
