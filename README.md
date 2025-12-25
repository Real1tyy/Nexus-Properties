<div align="center">

# Nexus Properties

![Downloads](https://img.shields.io/github/downloads/Real1tyy/Nexus-Properties/total?label=Downloads&style=for-the-badge)
![Release](https://img.shields.io/github/v/release/Real1tyy/Nexus-Properties?label=Latest%20Release&style=for-the-badge)
![Stars](https://img.shields.io/github/stars/Real1tyy/Nexus-Properties?style=for-the-badge)
![License](https://img.shields.io/github/license/Real1tyy/Nexus-Properties?style=for-the-badge)
![Obsidian](https://img.shields.io/badge/obsidian-plugin-purple.svg?style=for-the-badge)

**Automated property management and interactive relationship visualization for Obsidian — bidirectional sync, graph views, and intelligent property inheritance for power users who want structured knowledge networks.**

---

## 🎬 Video Tutorials

**[View All Video Tutorials →](https://real1tyy.github.io/Nexus-Properties/videos)**

### Full Tutorial — Zero to Mastery

<a href="https://www.youtube.com/watch?v=Im0SfuBHamo" target="_blank">
  <img src="https://img.youtube.com/vi/Im0SfuBHamo/maxresdefault.jpg" alt="Nexus Properties - Full Tutorial" style="width:100%;">
</a>

**Complete Workflow Guide**: In this full tutorial, I walk you through exactly how to use Nexus Properties in practice — from installation and creating your first relationships, to bidirectional sync, graph views, color rules, filtering, and more.

</div>

---

## 📸 Screenshots

### Relationship Graph View

![Relationship Graph View](docs-site/static/img/graph_view.png)

*Interactive graph visualization with hierarchical layout, color-coded nodes, and powerful filtering*

### Zoom Mode & Node Preview

![Zoom Mode](docs-site/static/img/zoom_mode.png)

*Click any node to preview its content, frontmatter, and navigate relationships*

### Context Menus & Node Creation

<p align="center">
<img src="docs-site/static/img/context_menu.png" alt="Context Menu" width="45%">
<img src="docs-site/static/img/node_creation.png" alt="Node Creation" width="45%">
</p>

*Right-click for quick actions and create child/parent/related nodes with property inheritance*

### Color Rules & Filtering

![Color Rules](docs-site/static/img/color_rules.png)

*JavaScript-powered color rules and filtering for intelligent graph visualization*

Check out the [complete screenshots gallery](https://real1tyy.github.io/Nexus-Properties/screenshots) in the documentation to see all the plugin's visuals, including graph views, zoom mode, tooltips, settings, and more.

---

## 📚 Documentation

**[View Full Documentation →](https://real1tyy.github.io/Nexus-Properties/)**

Quick Links:
- [Installation](https://real1tyy.github.io/Nexus-Properties/installation) • [Quickstart](https://real1tyy.github.io/Nexus-Properties/quickstart) • [Configuration](https://real1tyy.github.io/Nexus-Properties/configuration)
- [Features Overview](https://real1tyy.github.io/Nexus-Properties/features/overview) • [FAQ](https://real1tyy.github.io/Nexus-Properties/faq) • [Troubleshooting](https://real1tyy.github.io/Nexus-Properties/troubleshooting)

---

## 📦 Installation

Nexus Properties is currently **awaiting approval** for the Obsidian Community Plugin store. In the meantime, you can install it using one of these methods:

### 🎯 Recommended: BRAT (Beta Reviewers Auto-update Tool)

The easiest way to install and keep Nexus Properties up to date:

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's Community Plugins
2. Open BRAT settings (Settings → BRAT)
3. Click **Add Beta Plugin**
4. Enter this repository URL: `https://github.com/Real1tyy/Nexus-Properties`
5. Click **Add Plugin**
6. Enable Nexus Properties in Settings → Community Plugins

**Benefits**: Automatic updates, smooth experience, one-click installation

### 📥 Manual Installation from GitHub Releases

1. Go to [Releases](https://github.com/Real1tyy/Nexus-Properties/releases)
2. Download the latest release assets:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Create folder: `{VaultFolder}/.obsidian/plugins/nexus-properties/`
4. Move downloaded files into the folder
5. Reload Obsidian (Ctrl/Cmd + R)
6. Enable Nexus Properties in Settings → Community Plugins

**Note**: All releases are versioned and tagged for easy reference.

### ✨ Coming Soon

Once approved for the Community Plugin store, you'll be able to install Nexus Properties directly from Settings → Community Plugins → Browse.

---

## 📱 **Mobile Support**

The plugin is currently focused on desktop use. Mobile support is not guaranteed but may work with limitations. If you encounter any problems or have suggestions for improvement, please create a [GitHub issue](https://github.com/Real1tyy/Nexus-Properties/issues) and we'll address it.

---

## **Top 5 Killer Features**

### **1️⃣ Bidirectional Sync — Set Once, Updates Everywhere**

When you define a relationship in one file, Nexus Properties automatically updates the other file. No manual work, no inconsistencies — just pure automation.

- **Automatic reciprocal updates** - Add a child, parent is auto-updated
- **Related relationship sync** - Mark files as related, both sides update
- **Deletion cleanup** - Remove relationships, both files stay consistent
- **Real-time sync** - Changes propagate immediately on file save
- **Zero maintenance** - Never manually maintain both sides of a relationship

### **2️⃣ Interactive Graph Visualization — See Your Knowledge Network**

Visualize your entire knowledge structure in an interactive graph with multiple view modes, drag-and-drop navigation, and intelligent layouts.

- **Multiple view modes** - Hierarchical, Related, All Related, Start from Current
- **Drag-and-drop** - Rearrange nodes for better visualization
- **Zoom mode** - Click nodes for full content preview
- **Tooltips** - Hover for quick property inspection
- **Context menus** - Right-click for quick actions
- **Search** - Find and highlight nodes instantly

### **3️⃣ Smart Node Creation — Inherit Everything**

Create child, parent, or related nodes with a single command. New nodes automatically inherit all properties from the source, maintaining consistency across your network.

- **Property inheritance** - All frontmatter copied to new nodes
- **Automatic relationships** - Bidirectional links created instantly
- **Zettel ID generation** - Unique timestamp-based identifiers
- **Same-folder creation** - New nodes created alongside source
- **Template support** - Inherit templates and Templater properties
- **Context menu creation** - Right-click any node to create related nodes

### **4️⃣ JavaScript-Powered Color Rules — Intelligent Visualization**

Define color rules using JavaScript expressions to visually categorize your notes. First match wins, giving you complete control over node appearance.

- **Expression-based** - `status === 'complete'` → Green
- **Property access** - Reference any frontmatter property
- **Rule priority** - First matching rule applies
- **Enable/disable** - Toggle rules on/off without deletion
- **Visual feedback** - Instantly see which nodes match which rules
- **Complex logic** - Use AND, OR, comparisons, and more

### **5️⃣ Advanced Filtering — Focus on What Matters**

Filter the graph to show only nodes matching specific criteria. Use JavaScript expressions to create powerful filters and save them as presets for quick access.

- **Expression-based filtering** - `priority === 'high' && status !== 'done'`
- **Filter presets** - Save and name commonly-used filters
- **Real-time updates** - Graph updates as you type
- **Works with all views** - Filter any view mode
- **Property-based** - Filter on any frontmatter property
- **Complex expressions** - Combine multiple conditions

---

## ✨ **Additional Powerful Features**

### 🔗 **Relationship Management**

- **Three relationship types** - Parent, Child, Related
- **Configurable property names** - Use your own property names
- **Wiki link format** - Standard Obsidian `[[note]]` syntax
- **Array support** - Multiple children, multiple related notes
- **Circular detection** - Prevents infinite loops
- **Orphan detection** - Find notes without relationships

### 🎨 **Graph Customization**

- **Node layouts** - Hierarchical tree, force-directed, radial
- **Animation controls** - Configurable animation duration (0-2000ms)
- **View modes** - Hierarchical, Related, All Related, Start from Current
- **Recursion depth** - Control how deep "All Related" traverses
- **Auto-link siblings** - Automatically connect sibling nodes
- **Edge styling** - Visual distinction between relationship types

### 🔍 **Navigation & Discovery**

- **Search** - Find nodes by name with instant highlighting
- **Tooltips** - Hover for quick property preview (configurable delay)
- **Zoom mode** - Click for full content and frontmatter preview
- **Context menus** - Right-click for quick actions and navigation
- **Double-click open** - Open files directly from graph
- **Breadcrumb navigation** - Track your position in hierarchies

### ⚙️ **Configuration & Performance**

- **Directory scanning** - Focus on specific folders for better performance
- **Excluded properties** - Hide properties from tooltips and previews
- **Path-based exclusions** - Different exclusions for different folders
- **Indexing controls** - Manual and automatic index rebuilding
- **Performance tuning** - Adjust recursion depth and animation for large vaults
- **Ribbon icon toggle** - Show/hide sidebar icon

---

## Support & Sponsorship

If you find Nexus Properties useful and want to support its ongoing development, please consider becoming a sponsor. Your contribution helps ensure continuous maintenance, bug fixes, and the introduction of new features.

- [Support My Work](https://github.com/Real1tyy#-support-my-work)

Every contribution, no matter the size, is greatly appreciated!

---

## Contributing

MIT-licensed. PRs welcome! See [Contributing Guide](https://real1tyy.github.io/Nexus-Properties/contributing) for details.

---

## Credits & Acknowledgments

Nexus Properties is built using [Cytoscape.js](https://js.cytoscape.org/), a powerful and flexible graph visualization library. Cytoscape.js provides the robust graph rendering engine that powers Nexus Properties' interactive visualizations. We're grateful to the Cytoscape.js team for creating such an excellent foundation.

---
