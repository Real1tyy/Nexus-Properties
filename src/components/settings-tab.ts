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
		this.addGraphSettings(containerEl);
		this.addPreviewSettings(containerEl);
		this.addFilteringSettings(containerEl);
		this.addRescanSection(containerEl);
		this.addDirectorySettings(containerEl);
		this.addDirectRelationshipSettings(containerEl);
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

	private addGraphSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Graph Display").setHeading();

		new Setting(containerEl)
			.setName("Graph enlarged width")
			.setDesc("Percentage of window width when graph is enlarged (50-100%)")
			.addSlider((slider) =>
				slider
					.setLimits(50, 100, 1)
					.setValue(settings.graphEnlargedWidthPercent)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							graphEnlargedWidthPercent: value,
						}));
					})
			);

		new Setting(containerEl)
			.setName("Zoom preview height")
			.setDesc("Maximum height in pixels for the zoom preview panel (150-500px)")
			.addSlider((slider) =>
				slider
					.setLimits(120, 700, 10)
					.setValue(settings.graphZoomPreviewHeight)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							graphZoomPreviewHeight: value,
						}));
					})
			);

		new Setting(containerEl)
			.setName("Display properties in nodes")
			.setDesc("Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)")
			.addText((text) => {
				text
					.setPlaceholder("e.g., status, priority")
					.setValue(settings.displayNodeProperties.join(", "))
					.onChange(async (value) => {
						const properties = value
							.split(",")
							.map((p) => p.trim())
							.filter((p) => p.length > 0);

						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							displayNodeProperties: properties,
						}));
					});
				text.inputEl.addClass("nexus-property-input");
			});
	}

	private addPreviewSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Preview Settings").setHeading();

		new Setting(containerEl)
			.setName("Hide empty properties")
			.setDesc("Hide properties with empty, null, or undefined values in the node preview modal")
			.addToggle((toggle) =>
				toggle.setValue(settings.hideEmptyProperties).onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						hideEmptyProperties: value,
					}));
				})
			);

		new Setting(containerEl)
			.setName("Hide underscore properties")
			.setDesc("Hide properties that start with an underscore (_) in the node preview modal")
			.addToggle((toggle) =>
				toggle.setValue(settings.hideUnderscoreProperties).onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						hideUnderscoreProperties: value,
					}));
				})
			);

		new Setting(containerEl)
			.setName("Zoom: hide frontmatter by default")
			.setDesc("When entering zoom preview, frontmatter starts hidden by default")
			.addToggle((toggle) =>
				toggle.setValue(settings.zoomHideFrontmatterByDefault).onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						zoomHideFrontmatterByDefault: value,
					}));
				})
			);

		new Setting(containerEl)
			.setName("Zoom: hide content by default")
			.setDesc("When entering zoom preview, file content starts hidden by default")
			.addToggle((toggle) =>
				toggle.setValue(settings.zoomHideContentByDefault).onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						zoomHideContentByDefault: value,
					}));
				})
			);
	}

	private addFilteringSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Graph filtering").setHeading();

		const desc = containerEl.createDiv();
		desc.createEl("p", {
			text: "Show only nodes (and their edges) whose frontmatter matches ALL expressions. Each line should be a JavaScript expression returning true/false; use 'fm' to access frontmatter. The source node is always shown.",
		});

		const examples = [
			"fm.Status === 'Active'",
			"fm.type === 'project'",
			"Array.isArray(fm.tags) && fm.tags.includes('important')",
		];

		const examplesContainer = desc.createDiv("settings-info-box");
		examplesContainer.createEl("strong", { text: "Examples:" });
		const ul = examplesContainer.createEl("ul");
		examples.forEach((ex) => {
			const li = ul.createEl("li");
			const code = li.createEl("code", { text: ex });
			code.addClass("settings-info-box-example");
		});

		new Setting(containerEl)
			.setName("Filter expressions")
			.setDesc(
				"One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only nodes matching all expressions are shown in the graph."
			)
			.addTextArea((text) => {
				text.setPlaceholder("fm.Status === 'Active'\nfm.type === 'project'");
				text.setValue((settings.filterExpressions ?? []).join("\n"));

				const commit = async (value: string) => {
					const expressions = value
						.split("\n")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						filterExpressions: expressions,
					}));
				};

				text.inputEl.addEventListener("blur", () => void commit(text.inputEl.value));
				text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
					if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						void commit(text.inputEl.value);
					}
				});

				text.inputEl.rows = 5;
				text.inputEl.addClass("settings-info-box-example");
			});
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
			.setName("Auto-link siblings")
			.setDesc(
				"Automatically mark nodes as related when they share the same parent (siblings are related to each other)"
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.autoLinkSiblings).onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						autoLinkSiblings: value,
					}));
				})
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
---`,
			cls: "settings-info-box-example",
		});

		const infoBox = exampleContainer.createDiv("settings-info-note");
		infoBox.createEl("strong", { text: "ℹ️ Note: " });
		infoBox.appendText(
			"All recursive relationships (like all parents, all children, all related) are computed dynamically in the graph view and are not stored in frontmatter."
		);
	}
}
