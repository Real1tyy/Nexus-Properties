import { type App, PluginSettingTab, Setting } from "obsidian";
import type NexusPropertiesPlugin from "../main";

export class NexusPropertiesSettingsTab extends PluginSettingTab {
	plugin: NexusPropertiesPlugin;

	constructor(app: App, plugin: NexusPropertiesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h1", { text: "Nexus Properties Settings" });

		this.addUserInterfaceSettings(containerEl);
		this.addRescanSection(containerEl);
		this.addDirectorySettings(containerEl);
		this.addDirectRelationshipSettings(containerEl);
		this.addComputedRelationshipSettings(containerEl);
		this.addExampleSection(containerEl);
	}

	private addUserInterfaceSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("User Interface").setHeading();

		new Setting(containerEl)
			.setName("Show ribbon icon")
			.setDesc("Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.")
			.addToggle((toggle) =>
				toggle.setValue(settings.showRibbonIcon).onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						showRibbonIcon: value,
					}));
				})
			);
	}

	private addRescanSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Indexing").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.setText(
			"Manually index all files in your vault and assign relationship properties based on your configured settings. This process will scan all files in the configured directories and update their frontmatter with bidirectional and computed relationships."
		);

		new Setting(containerEl)
			.setName("Index and assign properties to all files")
			.setDesc(
				"Scan all files in configured directories and update their relationship properties. This may take some time for large vaults."
			)
			.addButton((button) => {
				button
					.setButtonText("Rescan Everything")
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						button.setButtonText("Rescanning...");

						try {
							await this.plugin.triggerFullRescan();
							button.setButtonText("✓ Complete!");
							setTimeout(() => {
								button.setButtonText("Rescan Everything");
								button.setDisabled(false);
							}, 2000);
						} catch (error) {
							console.error("Error during rescan:", error);
							button.setButtonText("✗ Error");
							setTimeout(() => {
								button.setButtonText("Rescan Everything");
								button.setDisabled(false);
							}, 2000);
						}
					});
			});
	}

	private addDirectorySettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Directory scanning").setHeading();

		const descEl = containerEl.createDiv("setting-item-description");
		descEl.setText(
			'Configure which directories to scan for files with relationships. Use "*" to scan all directories, or specify individual directories to limit scanning.'
		);

		// Show current directories
		const directoriesContainer = containerEl.createDiv("directories-list");
		directoriesContainer.style.marginBottom = "1em";

		const renderDirectories = () => {
			directoriesContainer.empty();

			for (const dir of settings.directories) {
				const dirSetting = new Setting(directoriesContainer).setName(dir).addButton((button) =>
					button
						.setButtonText("Remove")
						.setWarning()
						.onClick(async () => {
							const newDirs = settings.directories.filter((d) => d !== dir);
							// Prevent removing all directories
							if (newDirs.length === 0) {
								newDirs.push("*");
							}
							await this.plugin.settingsStore.updateSettings((s) => ({
								...s,
								directories: newDirs,
							}));
							this.display();
						})
				);

				// Add special styling for "*" (scan all)
				if (dir === "*") {
					dirSetting.setDesc("Scan all directories");
				} else {
					dirSetting.setDesc(`Includes all subdirectories: ${dir}/**`);
				}
			}
		};

		renderDirectories();

		// Add new directory
		new Setting(containerEl)
			.setName("Add directory")
			.setDesc("Enter a directory path (e.g., 'Projects' or 'Notes/Work')")
			.addText((text) => {
				text.setPlaceholder("Directory path");
				text.inputEl.id = "nexus-new-directory";
			})
			.addButton((button) =>
				button
					.setButtonText("Add")
					.setCta()
					.onClick(async () => {
						const input = containerEl.querySelector("#nexus-new-directory") as HTMLInputElement;
						const newDir = input.value.trim();

						if (!newDir) {
							return;
						}

						// If adding a specific directory, remove "*" if it exists
						let newDirs = [...settings.directories];
						if (newDir !== "*" && newDirs.includes("*")) {
							newDirs = newDirs.filter((d) => d !== "*");
						}

						// Add the new directory if it doesn't exist
						if (!newDirs.includes(newDir)) {
							newDirs.push(newDir);
						}

						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							directories: newDirs,
						}));

						input.value = "";
						this.display();
					})
			);

		// Quick action: Reset to scan all
		if (!settings.directories.includes("*")) {
			new Setting(containerEl)
				.setName("Reset to scan all directories")
				.setDesc("Clear all specific directories and scan the entire vault")
				.addButton((button) =>
					button.setButtonText("Scan all").onClick(async () => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							directories: ["*"],
						}));
						this.display();
					})
				);
		}
	}

	private addDirectRelationshipSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Direct relationship properties").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText(
				"Configure property names for direct bidirectional relationships. When you set a relationship in one direction, the plugin automatically updates the reverse relationship."
			);

		new Setting(containerEl)
			.setName("Parent property")
			.setDesc("Property name for parent reference (bidirectional with children)")
			.addText((text) =>
				text
					.setPlaceholder("parent")
					.setValue(settings.parentProp)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							parentProp: value || "parent",
						}));
					})
			);

		new Setting(containerEl)
			.setName("Children property")
			.setDesc("Property name for children references (bidirectional with parent)")
			.addText((text) =>
				text
					.setPlaceholder("children")
					.setValue(settings.childrenProp)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							childrenProp: value || "children",
						}));
					})
			);

		new Setting(containerEl)
			.setName("Related property")
			.setDesc("Property name for related files (bidirectional - automatically syncs between linked files)")
			.addText((text) =>
				text
					.setPlaceholder("related")
					.setValue(settings.relatedProp)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							relatedProp: value || "related",
						}));
					})
			);
	}

	private addComputedRelationshipSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Computed recursive properties").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText(
				"Configure property names for automatically computed recursive relationships. These properties are read-only and automatically maintained by the plugin."
			);

		new Setting(containerEl)
			.setName("All parents property")
			.setDesc("Property name for all recursive parents (automatically computed)")
			.addText((text) =>
				text
					.setPlaceholder("allParents")
					.setValue(settings.allParentsProp)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							allParentsProp: value || "allParents",
						}));
					})
			);

		new Setting(containerEl)
			.setName("All children property")
			.setDesc("Property name for all recursive children (automatically computed)")
			.addText((text) =>
				text
					.setPlaceholder("allChildren")
					.setValue(settings.allChildrenProp)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							allChildrenProp: value || "allChildren",
						}));
					})
			);

		new Setting(containerEl)
			.setName("All related property")
			.setDesc("Property name for all related files including transitive relationships (automatically computed)")
			.addText((text) =>
				text
					.setPlaceholder("allRelated")
					.setValue(settings.allRelatedProp)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							allRelatedProp: value || "allRelated",
						}));
					})
			);
	}

	private addExampleSection(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("How it works").setHeading();

		const exampleContainer = containerEl.createDiv("settings-info-box");

		exampleContainer.createEl("h3", { text: "Bidirectional sync example" });
		exampleContainer.createEl("p", {
			text: "When you add a child relationship in one file, the parent relationship is automatically created in the other file:",
		});

		const beforeAfter = exampleContainer.createDiv("example-grid");

		const beforeSection = beforeAfter.createDiv("example-section");
		beforeSection.createEl("h4", { text: "You write this in parent-note.md:" });
		beforeSection.createEl("pre", {
			text: `---
${settings.childrenProp}:
  - "[[child-note-1]]"
  - "[[child-note-2]]"
---`,
			cls: "settings-info-box-example",
		});

		const afterSection = beforeAfter.createDiv("example-section");
		afterSection.createEl("h4", { text: "Plugin automatically updates child-note-1.md:" });
		afterSection.createEl("pre", {
			text: `---
${settings.parentProp}: "[[parent-note]]"
---`,
			cls: "settings-info-box-example",
		});

		exampleContainer.createEl("h3", { text: "Recursive tree computation" });
		exampleContainer.createEl("p", {
			text: "The plugin automatically computes all recursive relationships in the tree:",
		});

		const treeExample = exampleContainer.createDiv();
		treeExample.createEl("h4", { text: "If you have this hierarchy:" });
		treeExample.createEl("pre", {
			text: `grandparent.md
  ${settings.childrenProp}: ["[[parent.md]]"]

parent.md
  ${settings.parentProp}: "[[grandparent.md]]"
  ${settings.childrenProp}: ["[[child.md]]"]

child.md
  ${settings.parentProp}: "[[parent.md]]"`,
			cls: "settings-info-box-example",
		});

		treeExample.createEl("h4", { text: "Then child.md will automatically have:" });
		treeExample.createEl("pre", {
			text: `---
${settings.parentProp}: "[[parent.md]]"
${settings.allParentsProp}:
  - "[[parent.md]]"
  - "[[grandparent.md]]"
---`,
			cls: "settings-info-box-example",
		});

		const warningBox = exampleContainer.createDiv("setting-item-description");
		warningBox.style.marginTop = "1em";
		warningBox.style.padding = "1em";
		warningBox.style.backgroundColor = "var(--background-secondary)";
		warningBox.style.borderRadius = "4px";
		warningBox.createEl("strong", { text: "⚠️ Important: " });
		warningBox.appendText(
			"The computed properties (allParents, allChildren, allRelated) are automatically managed by the plugin. Any manual edits to these properties will be overwritten."
		);
	}
}
