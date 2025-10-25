---
sidebar_position: 2
---

# Installation

This guide will help you install Nexus Properties in Obsidian.

## Prerequisites

- **Obsidian version 1.6.0 or higher**
- Basic familiarity with Obsidian's interface

## Installation Methods

### Method 1: Community Plugins (Recommended)

:::info Coming Soon
Nexus Properties is currently awaiting approval for the Obsidian Community Plugins directory. This will be the easiest installation method once available.
:::

1. Open Obsidian Settings
2. Navigate to **Community plugins**
3. Click **Browse** to open the community plugins browser
4. Search for "**Nexus Properties**"
5. Click **Install**
6. Once installed, click **Enable** to activate the plugin

### Method 2: Manual Installation (Beta Testers)

If you want to install the latest development version or the plugin is not yet available in the community plugins:

1. Download the latest release from [GitHub Releases](https://github.com/Real1tyy/Nexus-Properties/releases)
2. Extract the following files from the release:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Navigate to your vault's plugin folder: `<vault>/.obsidian/plugins/`
4. Create a new folder called `nexus-properties`
5. Copy the extracted files into the `nexus-properties` folder
6. Restart Obsidian or reload the plugin
7. Enable the plugin in **Settings → Community plugins**

### Method 3: Build from Source (Developers)

If you want to contribute or test unreleased features:

```bash
# Clone the repository
git clone https://github.com/Real1tyy/Nexus-Properties.git
cd Nexus-Properties

# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Or run in development mode with hot reload
pnpm dev
```

Then follow the manual installation steps above to copy the built files to your vault's plugin folder.

## Post-Installation Setup

After installing Nexus Properties:

1. **Enable the Plugin**
   - Go to Settings → Community plugins
   - Find "Nexus Properties" in the list
   - Toggle it on

2. **Configure Basic Settings** (Optional)
   - Open Settings → Nexus Properties
   - Review the default property names (`Parent`, `Child`, `Related`)
   - Adjust settings to match your workflow
   - See [Configuration](configuration) for detailed settings

3. **Open the Relationship Graph**
   - Click the ribbon icon (if enabled)
   - Or use the command palette: `Ctrl/Cmd+P` → "Show Relationship Graph"
   - Or use the command: "Nexus Properties: Show Relationship Graph"

## Verifying Installation

To verify that Nexus Properties is installed correctly:

1. Open the command palette (`Ctrl/Cmd+P`)
2. Search for "Nexus Properties"
3. You should see commands like:
   - Show Relationship Graph
   - Create Parent Node
   - Create Child Node
   - Create Related Node
   - And more...

If you see these commands, the plugin is installed successfully! 🎉

## Next Steps

- [Follow the Quickstart Guide](quickstart) to set up your first relationships
- [Explore Configuration Options](configuration) to customize the plugin
- [Learn about Features](features/overview) to discover what Nexus Properties can do

## Troubleshooting Installation

### Plugin Not Appearing

- Make sure you're running Obsidian 1.6.0 or higher
- Restart Obsidian completely (close and reopen)
- Check that the plugin files are in the correct folder: `<vault>/.obsidian/plugins/nexus-properties/`

### Plugin Won't Enable

- Check the Obsidian console (`Ctrl/Cmd+Shift+I`) for error messages
- Make sure all required files (`main.js`, `manifest.json`, `styles.css`) are present
- Try disabling other plugins to check for conflicts

### Commands Not Working

- Verify the plugin is enabled in Settings → Community plugins
- Some commands are only available when viewing indexed files
- Check your directory scanning settings if files aren't being indexed

For more help, see [Troubleshooting](troubleshooting) or [open an issue](https://github.com/Real1tyy/Nexus-Properties/issues).
