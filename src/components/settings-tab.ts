import { type App, PluginSettingTab, Setting } from "obsidian";
import type NexusPropertiesPlugin from "../main";
import { SETTINGS_DEFAULTS } from "../types/constants";
import type { NexusPropertiesSettingsSchema } from "../types/settings";
import { SettingsUIBuilder } from "../utils/settings-ui-builder";

export class NexusPropertiesSettingsTab extends PluginSettingTab {
	plugin: NexusPropertiesPlugin;
	private uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>;

	constructor(app: App, plugin: NexusPropertiesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.uiBuilder = new SettingsUIBuilder(this.plugin.settingsStore);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h1", { text: "Nexus Properties Settings" });

		this.addUserInterfaceSettings(containerEl);
		this.addGraphSettings(containerEl);
		this.addPreviewSettings(containerEl);
		this.addColorSettings(containerEl);
		this.addFilteringSettings(containerEl);
		this.addRescanSection(containerEl);
		this.addDirectorySettings(containerEl);
		this.addDirectRelationshipSettings(containerEl);
		this.addNodeCreationSettings(containerEl);
		this.addExampleSection(containerEl);
	}

	private addUserInterfaceSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("User Interface").setHeading();

		this.uiBuilder.auto(containerEl, {
			key: "showRibbonIcon",
			name: "Show ribbon icon",
			desc: "Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.",
		});
	}

	private addGraphSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Graph Display").setHeading();

		this.uiBuilder.auto(containerEl, {
			key: "graphEnlargedWidthPercent",
			name: "Graph enlarged width",
			desc: "Percentage of window width when graph is enlarged",
			min: 50,
			max: 100,
			step: 1,
		});

		this.uiBuilder.auto(containerEl, {
			key: "graphZoomPreviewHeight",
			name: "Zoom preview height",
			desc: "Maximum height in pixels for the zoom preview panel",
			min: 120,
			max: 700,
			step: 10,
		});

		this.uiBuilder.auto(containerEl, {
			key: "graphAnimationDuration",
			name: "Graph animation duration",
			desc: "Duration of graph layout animations in milliseconds. Set to 0 for instant layout.",
			min: 0,
			max: 2000,
			step: 50,
		});

		this.uiBuilder.auto(containerEl, {
			key: "allRelatedMaxDepth",
			name: "All Related recursion depth",
			desc: "Maximum number of constellation levels to traverse when 'All Related' is enabled (1-20). Higher values show more distant relationships but may impact performance.",
			min: 1,
			max: 20,
			step: 1,
		});

		this.uiBuilder.auto(containerEl, {
			key: "hierarchyMaxDepth",
			name: "Hierarchy traversal depth",
			desc: "Maximum number of levels to traverse in hierarchy mode (1-50). Controls how deep the parent-child tree will be displayed.",
			min: 1,
			max: 50,
			step: 1,
		});

		this.uiBuilder.auto(containerEl, {
			key: "displayNodeProperties",
			name: "Display properties in nodes",
			desc: "Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)",
			placeholder: "e.g., status, priority",
		});

		this.uiBuilder.auto(containerEl, {
			key: "showGraphTooltips",
			name: "Show node tooltips",
			desc: "Display property tooltips when hovering over nodes in the graph. Can also be toggled with a hotkey.",
		});

		this.uiBuilder.auto(containerEl, {
			key: "graphTooltipWidth",
			name: "Tooltip width",
			desc: "Maximum width of node tooltips in pixels (150-500px)",
			min: 150,
			max: 500,
			step: 5,
		});
	}

	private addPreviewSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Property Display").setHeading();

		this.uiBuilder.auto(containerEl, {
			key: "hideEmptyProperties",
			name: "Hide empty properties",
			desc: "Hide properties with empty, null, or undefined values in tooltips and previews",
		});

		this.uiBuilder.auto(containerEl, {
			key: "hideUnderscoreProperties",
			name: "Hide underscore properties",
			desc: "Hide properties that start with an underscore (_) in tooltips and previews",
		});

		this.uiBuilder.auto(containerEl, {
			key: "zoomHideFrontmatterByDefault",
			name: "Zoom: hide frontmatter by default",
			desc: "When entering zoom preview, frontmatter starts hidden by default",
		});

		this.uiBuilder.auto(containerEl, {
			key: "zoomHideContentByDefault",
			name: "Zoom: hide content by default",
			desc: "When entering zoom preview, file content starts hidden by default",
		});
	}

	private addColorSettings(containerEl: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(containerEl).setName("Node colors").setHeading();

		// Default color setting with color picker
		new Setting(containerEl)
			.setName("Default node color")
			.setDesc("Default color for nodes when no color rules match")
			.addColorPicker((colorPicker) => {
				colorPicker.setValue(settings.defaultNodeColor);
				colorPicker.onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						defaultNodeColor: value || SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR,
					}));
				});
			});

		// Color rules section
		const colorRulesContainer = containerEl.createDiv();

		const desc = colorRulesContainer.createDiv();
		desc.createEl("p", {
			text: "Define color rules based on frontmatter properties. Rules are evaluated in order - the first matching rule determines the node color.",
		});

		// Examples section
		const examplesContainer = desc.createDiv("settings-info-box");

		examplesContainer.createEl("strong", { text: "Example color rules:" });
		const examplesList = examplesContainer.createEl("ul");

		const examples = [
			{
				expression: "fm.Status === 'Active'",
				color: "#22c55e",
				description: "Active nodes in green",
			},
			{
				expression: "fm.type === 'project'",
				color: "#3b82f6",
				description: "Project nodes in blue",
			},
			{
				expression: "fm.Priority === 'High'",
				color: "#ef4444",
				description: "High priority nodes in red",
			},
			{
				expression: "Array.isArray(fm.tags) && fm.tags.includes('important')",
				color: "#f59e0b",
				description: "Important tagged nodes in orange",
			},
		];

		for (const example of examples) {
			const li = examplesList.createEl("li", { cls: "color-example-item" });

			li.createEl("code", { text: example.expression, cls: "settings-info-box-example" });

			li.createSpan({ text: "→", cls: "color-arrow" });

			const colorSpan = li.createEl("span", { cls: "color-example-dot" });
			colorSpan.style.setProperty("--example-color", example.color);

			li.createSpan({ text: example.description, cls: "color-example-description" });
		}

		// Warning section
		const warningContainer = desc.createDiv("settings-warning-box");
		warningContainer.createEl("strong", { text: "⚠️ Important:" });
		warningContainer.createEl("p", {
			text: "Use 'fm' to access frontmatter properties. Invalid expressions will be ignored. Colors can be CSS color names, hex codes, or HSL values.",
		});

		// Color rules list
		const colorRulesListContainer = colorRulesContainer.createDiv();

		this.renderColorRulesList(colorRulesListContainer);

		// Add new color rule button
		new Setting(colorRulesContainer)
			.setName("Add color rule")
			.setDesc("Add a new color rule")
			.addButton((button) => {
				button.setButtonText("Add Rule");
				button.onClick(async () => {
					const newRule = {
						id: `color-rule-${Date.now()}`,
						expression: "",
						color: "hsl(200, 70%, 50%)",
						enabled: true,
					};

					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: [...s.colorRules, newRule],
					}));

					// Re-render the list
					this.renderColorRulesList(colorRulesListContainer);
				});
			});
	}

	private renderColorRulesList(container: HTMLElement): void {
		container.empty();
		const { colorRules } = this.plugin.settingsStore.currentSettings;

		if (colorRules.length === 0) {
			const emptyState = container.createDiv();
			emptyState.textContent = "No color rules defined. Click 'Add Rule' to create one.";
			return;
		}

		colorRules.forEach((rule, index) => {
			const ruleContainer = container.createDiv("color-rule-item");

			// Single row with all controls
			const mainRow = ruleContainer.createDiv("color-rule-main-row");

			// Left section: order, checkbox, expression
			const leftSection = mainRow.createDiv("color-rule-left");

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: "color-rule-order",
			});

			const enableToggle = leftSection.createEl("input", { type: "checkbox" });
			enableToggle.checked = rule.enabled;
			enableToggle.onchange = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, enabled: enableToggle.checked } : r)),
				}));
			};

			const expressionInput = leftSection.createEl("input", {
				type: "text",
				value: rule.expression,
				placeholder: "fm.Status === 'Active'",
				cls: "color-rule-expression-input",
			});

			const updateExpression = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, expression: expressionInput.value } : r)),
				}));
			};

			expressionInput.addEventListener("blur", updateExpression);
			expressionInput.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					e.preventDefault();
					updateExpression();
				}
			});

			// Right section: color picker + controls
			const rightSection = mainRow.createDiv("color-rule-right");

			// Integrated color picker using Setting
			const colorPickerWrapper = rightSection.createDiv("color-rule-picker-wrapper");
			new Setting(colorPickerWrapper).addColorPicker((colorPicker) => {
				colorPicker.setValue(rule.color);
				colorPicker.onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, color: value } : r)),
					}));
				});
			});

			// Control buttons
			const controlsSection = rightSection.createDiv("color-rule-controls");

			if (index > 0) {
				const moveUpButton = controlsSection.createEl("button", {
					text: "↑",
					attr: { title: "Move up" },
					cls: "color-rule-btn",
				});
				moveUpButton.onclick = async () => {
					await this.plugin.settingsStore.updateSettings((s) => {
						const currentRules = [...s.colorRules];
						const ruleIndex = currentRules.findIndex((r) => r.id === rule.id);
						if (ruleIndex > 0) {
							[currentRules[ruleIndex], currentRules[ruleIndex - 1]] = [
								currentRules[ruleIndex - 1],
								currentRules[ruleIndex],
							];
						}
						return { ...s, colorRules: currentRules };
					});
					this.renderColorRulesList(container);
				};
			}

			if (index < colorRules.length - 1) {
				const moveDownButton = controlsSection.createEl("button", {
					text: "↓",
					attr: { title: "Move down" },
					cls: "color-rule-btn",
				});
				moveDownButton.onclick = async () => {
					await this.plugin.settingsStore.updateSettings((s) => {
						const currentRules = [...s.colorRules];
						const ruleIndex = currentRules.findIndex((r) => r.id === rule.id);
						if (ruleIndex !== -1 && ruleIndex < currentRules.length - 1) {
							[currentRules[ruleIndex], currentRules[ruleIndex + 1]] = [
								currentRules[ruleIndex + 1],
								currentRules[ruleIndex],
							];
						}
						return { ...s, colorRules: currentRules };
					});
					this.renderColorRulesList(container);
				};
			}

			const deleteButton = controlsSection.createEl("button", {
				text: "×",
				attr: { title: "Delete rule" },
				cls: "color-rule-btn color-rule-btn-delete",
			});
			deleteButton.onclick = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					colorRules: s.colorRules.filter((r) => r.id !== rule.id),
				}));
				this.renderColorRulesList(container);
			};
		});
	}

	private addFilteringSettings(containerEl: HTMLElement): void {
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
		for (const ex of examples) {
			const li = ul.createEl("li");
			const code = li.createEl("code", { text: ex });
			code.addClass("settings-info-box-example");
		}

		this.uiBuilder.auto(containerEl, {
			key: "filterExpressions",
			name: "Filter expressions",
			desc: "One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only nodes matching all expressions are shown in the graph.",
			placeholder: "fm.Status === 'Active'\nfm.type === 'project'",
			multiline: true,
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
		const { currentSettings: settings } = this.plugin.settingsStore;

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
		new Setting(containerEl).setName("Direct relationship properties").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText(
				"Configure property names for direct bidirectional relationships. When you set a relationship in one direction, the plugin automatically updates the reverse relationship."
			);

		this.uiBuilder.auto(containerEl, {
			key: "autoLinkSiblings",
			name: "Auto-link siblings",
			desc: "Automatically mark nodes as related when they share the same parent (siblings are related to each other)",
		});

		this.uiBuilder.auto(containerEl, {
			key: "parentProp",
			name: "Parent property",
			desc: "Property name for parent reference (bidirectional with children)",
			placeholder: "parent",
		});

		this.uiBuilder.auto(containerEl, {
			key: "childrenProp",
			name: "Children property",
			desc: "Property name for children references (bidirectional with parent)",
			placeholder: "children",
		});

		this.uiBuilder.auto(containerEl, {
			key: "relatedProp",
			name: "Related property",
			desc: "Property name for related files (bidirectional - automatically syncs between linked files)",
			placeholder: "related",
		});
	}

	private addNodeCreationSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Node creation shortcuts").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText(
				"Enable quick creation of Parent, Child, and Related nodes from the command palette. New nodes inherit frontmatter properties and automatically establish bidirectional relationships."
			);

		this.uiBuilder.auto(containerEl, {
			key: "zettelIdProp",
			name: "Zettel ID property",
			desc: "Property name for unique timestamp identifier assigned to new nodes",
			placeholder: "_ZettelID",
		});

		const infoBox = containerEl.createDiv("settings-info-box");
		infoBox.createEl("strong", { text: "How it works:" });
		const list = infoBox.createEl("ul");
		list.createEl("li", {
			text: "New nodes are created in the same folder as the source file",
		});
		list.createEl("li", {
			text: "All frontmatter properties are inherited (except Parent, Child, Related)",
		});
		list.createEl("li", {
			text: "A new Zettel ID is generated automatically (timestamp-based)",
		});
		list.createEl("li", {
			text: "Bidirectional relationships are established automatically",
		});
		list.createEl("li", {
			text: "Commands are only available for files in indexed directories",
		});
	}

	private addExampleSection(containerEl: HTMLElement): void {
		const { currentSettings: settings } = this.plugin.settingsStore;

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
