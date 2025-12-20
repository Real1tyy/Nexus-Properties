---
sidebar_position: 2
---

# Installation

Nexus Properties is currently **awaiting approval** for the Obsidian Community Plugin store. While we wait for approval, you can install it using one of the methods below.

## 🎯 Recommended: BRAT (Beta Reviewers Auto-update Tool)

The easiest and most convenient way to install Nexus Properties with automatic updates:

### Steps

1. **Install BRAT plugin** (if you don't have it already)

   - Open Settings → Community Plugins → Browse

   - Search for "BRAT"

   - Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat)

2. **Add Nexus Properties via BRAT**

   - Open Settings → BRAT

   - Click **Add Beta Plugin**

   - Enter the repository URL: `https://github.com/Real1tyy/Nexus-Properties`

   - Click **Add Plugin**

3. **Enable the plugin**

   - Go to Settings → Community Plugins

   - Find "Nexus Properties" in the list

   - Toggle it on

### Benefits of BRAT

- ✅ **Automatic updates** - Get new features and fixes automatically

- ✅ **Easy installation** - Just paste the repo URL

- ✅ **One-click setup** - No manual file management

- ✅ **Smoother experience** - Updates handle themselves

## 📥 Manual Installation from GitHub Releases

If you prefer manual installation or can't use BRAT:

### Steps

1. **Download the latest release**

   - Go to [GitHub Releases](https://github.com/Real1tyy/Nexus-Properties/releases)

   - Find the latest version (all releases are versioned and tagged)

   - Download these three files:

     - `main.js`

     - `manifest.json`

     - `styles.css`

2. **Create plugin folder**

   - Navigate to your vault's plugins directory: `{VaultFolder}/.obsidian/plugins/`

   - Create a new folder: `nexus-properties`

   - Full path should be: `{VaultFolder}/.obsidian/plugins/nexus-properties/`

3. **Move files**

   - Place the three downloaded files into the `nexus-properties` folder

4. **Reload Obsidian**

   - Press `Ctrl/Cmd + R` to reload Obsidian

   - Or close and reopen Obsidian

5. **Enable the plugin**

   - Go to Settings → Community Plugins

   - Find "Nexus Properties" in the installed plugins list

   - Toggle it on

### Note on Manual Updates

With manual installation, you'll need to repeat these steps whenever you want to update to a new version. Consider using BRAT for automatic updates.

## ✨ Coming Soon: Community Plugin Store

Once Nexus Properties is approved for the Obsidian Community Plugin store, you'll be able to install it directly:

1. Open Settings → Community Plugins → Browse

2. Search for "Nexus Properties"

3. Click Install

4. Enable the plugin

We'll update this page as soon as the plugin is available in the store!

## Requirements

- Obsidian 1.6.0+

## Opening Your Relationship Graph

After installation, you can open the Relationship Graph in three ways:

### Ribbon Icon (Optional)

If enabled in settings, a **fork icon appears in the left sidebar**. Simply click it to open the Relationship Graph.

### Command Palette

1. **Open command palette**

   - Press `Ctrl/Cmd + P` (or `Ctrl + E` on some systems)

   - This opens Obsidian's command search

2. **Find the graph command**

   - Type: `Nexus Properties: Show Relationship Graph`

   - Press Enter to open the graph view

### Direct Command

Use the command "Nexus Properties: Show Relationship Graph" from anywhere in Obsidian.

**Note for Obsidian beginners:** Obsidian plugins can add ribbon icons (left sidebar), commands (command palette), or both. Nexus Properties provides multiple options for maximum flexibility.

## First-time setup checklist

- Open Settings → Nexus Properties and review the default property names (`Parent`, `Child`, `Related`)

- Adjust property names if you already use different keys for relationships

- (Optional) Configure directory scanning to focus on specific folders

- (Optional) Enable the ribbon icon in settings for quick access

- **Open the Relationship Graph** using the command palette (`Ctrl/Cmd + P` → `Nexus Properties: Show Relationship Graph`)

- Create your first relationship by adding frontmatter to a note (see [Quick Start Guide](quickstart))

### Optional: Example Relationship Setup

```md
---
# Parent note
Child:
  - "[[Child Note 1]]"
  - "[[Child Note 2]]"
---

# Child note (auto-updated by Nexus Properties)
Parent: "[[Parent Note]]"
Related:
  - "[[Related Note]]"
---
```

## Troubleshooting Installation

### Plugin Not Appearing

- Make sure you're running Obsidian 1.6.0 or higher
- Restart Obsidian completely (close and reopen)
- Check that the plugin files are in the correct folder: `{VaultFolder}/.obsidian/plugins/nexus-properties/`

### Plugin Won't Enable

- Check the Obsidian console (`Ctrl/Cmd+Shift+I`) for error messages
- Make sure all required files (`main.js`, `manifest.json`, `styles.css`) are present
- Try disabling other plugins to check for conflicts

### Commands Not Working

- Verify the plugin is enabled in Settings → Community plugins
- Some commands are only available when viewing indexed files
- Check your directory scanning settings if files aren't being indexed

For more help, see [Troubleshooting](troubleshooting) or [open an issue](https://github.com/Real1tyy/Nexus-Properties/issues).
