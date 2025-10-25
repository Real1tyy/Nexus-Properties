import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { type App, PluginSettingTab, Setting } from "obsidian";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import type NexusPropertiesPlugin from "../main";
import { SETTINGS_DEFAULTS } from "../types/constants";

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

		this.uiBuilder.addToggle(containerEl, {
			key: "showRibbonIcon",
			name: "Show ribbon icon",
			desc: "Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.",
		});
	}

	private addGraphSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Graph Display").setHeading();

		this.uiBuilder.addToggle(containerEl, {
			key: "showSearchBar",
			name: "Show search bar by default",
			desc: "Display the search bar in the graph view when it loads. You can still toggle it with the command.",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "showFilterBar",
			name: "Show filter bar by default",
			desc: "Display the filter bar (preset selector and expression input) in the graph view when it loads. You can still toggle it with commands.",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphEnlargedWidthPercent",
			name: "Graph enlarged width",
			desc: "Percentage of window width when graph is enlarged",
			min: 50,
			max: 100,
			step: 1,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphZoomPreviewHeight",
			name: "Zoom preview height",
			desc: "Maximum height in pixels for the zoom preview panel",
			min: 120,
			max: 700,
			step: 10,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphZoomPreviewFrontmatterHeight",
			name: "Zoom preview frontmatter height",
			desc: "Maximum height in pixels for the frontmatter section in zoom preview",
			min: 50,
			max: 300,
			step: 5,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphAnimationDuration",
			name: "Graph animation duration",
			desc: "Duration of graph layout animations in milliseconds. Set to 0 for instant layout.",
			min: 0,
			max: 2000,
			step: 50,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "allRelatedMaxDepth",
			name: "All Related recursion depth",
			desc: "Maximum number of constellation levels to traverse when 'All Related' is enabled (1-20). Higher values show more distant relationships but may impact performance.",
			min: 1,
			max: 20,
			step: 1,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "hierarchyMaxDepth",
			name: "Hierarchy traversal depth",
			desc: "Maximum number of levels to traverse in hierarchy mode (1-50). Controls how deep the parent-child tree will be displayed.",
			min: 1,
			max: 50,
			step: 1,
		});

		this.uiBuilder.addTextArray(containerEl, {
			key: "displayNodeProperties",
			name: "Display properties in nodes",
			desc: "Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)",
			placeholder: "e.g., status, priority",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "showGraphTooltips",
			name: "Show node tooltips",
			desc: "Display property tooltips when hovering over nodes in the graph. Can also be toggled with a hotkey.",
		});

		this.uiBuilder.addSlider(containerEl, {
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

		this.uiBuilder.addToggle(containerEl, {
			key: "hideEmptyProperties",
			name: "Hide empty properties",
			desc: "Hide properties with empty, null, or undefined values in tooltips and previews",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "hideUnderscoreProperties",
			name: "Hide underscore properties",
			desc: "Hide properties that start with an underscore (_) in tooltips and previews",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "zoomHideFrontmatterByDefault",
			name: "Zoom: hide frontmatter by default",
			desc: "When entering zoom preview, frontmatter starts hidden by default",
		});

		this.uiBuilder.addToggle(containerEl, {
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
				expression: "Status === 'Active'",
				color: "#22c55e",
				description: "Active nodes in green",
			},
			{
				expression: "type === 'project'",
				color: "#3b82f6",
				description: "Project nodes in blue",
			},
			{
				expression: "Priority === 'High'",
				color: "#ef4444",
				description: "High priority nodes in red",
			},
			{
				expression: "Array.isArray(tags) && tags.includes('important')",
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
			text: "Access frontmatter properties directly by name. Invalid expressions will be ignored. Colors can be CSS color names, hex codes, or HSL values.",
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

	// Helper methods for rule list rendering
	private createRuleToggle(checked: boolean, onChange: (checked: boolean) => Promise<void>): HTMLInputElement {
		const toggle = document.createElement("input");
		toggle.type = "checkbox";
		toggle.checked = checked;
		toggle.onchange = async () => {
			await onChange(toggle.checked);
		};
		return toggle;
	}

	private createRuleInput(
		value: string,
		placeholder: string,
		cssClass: string,
		onUpdate: (value: string) => Promise<void>
	): HTMLInputElement {
		const input = document.createElement("input");
		input.type = "text";
		input.value = value;
		input.placeholder = placeholder;
		input.className = cssClass;

		const update = async () => {
			await onUpdate(input.value);
		};

		input.addEventListener("blur", update);
		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				update();
			}
		});

		return input;
	}

	private createMoveButtons(
		container: HTMLElement,
		index: number,
		totalCount: number,
		onMoveUp: () => Promise<void>,
		onMoveDown: () => Promise<void>
	): void {
		if (index > 0) {
			const moveUpButton = container.createEl("button", {
				text: "↑",
				attr: { title: "Move up" },
				cls: "color-rule-btn",
			});
			moveUpButton.onclick = onMoveUp;
		}

		if (index < totalCount - 1) {
			const moveDownButton = container.createEl("button", {
				text: "↓",
				attr: { title: "Move down" },
				cls: "color-rule-btn",
			});
			moveDownButton.onclick = onMoveDown;
		}
	}

	private createDeleteButton(container: HTMLElement, onDelete: () => Promise<void>): void {
		const deleteButton = container.createEl("button", {
			text: "×",
			attr: { title: "Delete rule" },
			cls: "color-rule-btn color-rule-btn-delete",
		});
		deleteButton.onclick = onDelete;
	}

	private swapRules<T extends { id: string }>(rules: T[], ruleId: string, offset: number): T[] {
		const currentRules = [...rules];
		const ruleIndex = currentRules.findIndex((r) => r.id === ruleId);
		const targetIndex = ruleIndex + offset;

		if (ruleIndex !== -1 && targetIndex >= 0 && targetIndex < currentRules.length) {
			[currentRules[ruleIndex], currentRules[targetIndex]] = [currentRules[targetIndex], currentRules[ruleIndex]];
		}

		return currentRules;
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
			const mainRow = ruleContainer.createDiv("color-rule-main-row");
			const leftSection = mainRow.createDiv("color-rule-left");

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: "color-rule-order",
			});

			const enableToggle = this.createRuleToggle(rule.enabled, async (checked) => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, enabled: checked } : r)),
				}));
			});
			leftSection.appendChild(enableToggle);

			const expressionInput = this.createRuleInput(
				rule.expression,
				"fm.Status === 'Active'",
				"color-rule-expression-input",
				async (value) => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: s.colorRules.map((r) => (r.id === rule.id ? { ...r, expression: value } : r)),
					}));
				}
			);
			leftSection.appendChild(expressionInput);

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

			const controlsSection = rightSection.createDiv("color-rule-controls");

			this.createMoveButtons(
				controlsSection,
				index,
				colorRules.length,
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: this.swapRules(s.colorRules, rule.id, -1),
					}));
					this.renderColorRulesList(container);
				},
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						colorRules: this.swapRules(s.colorRules, rule.id, 1),
					}));
					this.renderColorRulesList(container);
				}
			);

			this.createDeleteButton(controlsSection, async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					colorRules: s.colorRules.filter((r) => r.id !== rule.id),
				}));
				this.renderColorRulesList(container);
			});
		});
	}

	private renderExcludedPropertyRulesList(container: HTMLElement): void {
		container.empty();
		const { pathExcludedProperties } = this.plugin.settingsStore.currentSettings;

		if (pathExcludedProperties.length === 0) {
			const emptyState = container.createDiv();
			emptyState.textContent =
				"No path-based exclusion rules defined. Click 'Add Rule' to create one. Default excluded properties will be used for all files.";
			return;
		}

		pathExcludedProperties.forEach((rule, index) => {
			const ruleContainer = container.createDiv("color-rule-item");
			const mainRow = ruleContainer.createDiv("color-rule-main-row");
			const leftSection = mainRow.createDiv("color-rule-left");

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: "color-rule-order",
			});

			const enableToggle = this.createRuleToggle(rule.enabled, async (checked) => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					pathExcludedProperties: s.pathExcludedProperties.map((r) =>
						r.id === rule.id ? { ...r, enabled: checked } : r
					),
				}));
			});
			leftSection.appendChild(enableToggle);

			const pathInput = this.createRuleInput(rule.path, "Projects/", "color-rule-expression-input", async (value) => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					pathExcludedProperties: s.pathExcludedProperties.map((r) => (r.id === rule.id ? { ...r, path: value } : r)),
				}));
			});
			leftSection.appendChild(pathInput);

			const rightSection = mainRow.createDiv("color-rule-right");

			const propertiesInput = this.createRuleInput(
				rule.excludedProperties.join(", "),
				"status, progress, date",
				"excluded-properties-input",
				async (value) => {
					const propsArray = value
						.split(",")
						.map((p) => p.trim())
						.filter((p) => p.length > 0);

					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						pathExcludedProperties: s.pathExcludedProperties.map((r) =>
							r.id === rule.id ? { ...r, excludedProperties: propsArray } : r
						),
					}));
				}
			);
			rightSection.appendChild(propertiesInput);

			const controlsSection = rightSection.createDiv("color-rule-controls");

			this.createMoveButtons(
				controlsSection,
				index,
				pathExcludedProperties.length,
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						pathExcludedProperties: this.swapRules(s.pathExcludedProperties, rule.id, -1),
					}));
					this.renderExcludedPropertyRulesList(container);
				},
				async () => {
					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						pathExcludedProperties: this.swapRules(s.pathExcludedProperties, rule.id, 1),
					}));
					this.renderExcludedPropertyRulesList(container);
				}
			);

			this.createDeleteButton(controlsSection, async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					pathExcludedProperties: s.pathExcludedProperties.filter((r) => r.id !== rule.id),
				}));
				this.renderExcludedPropertyRulesList(container);
			});
		});
	}

	private addFilteringSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Graph filtering").setHeading();

		const desc = containerEl.createDiv();
		desc.createEl("p", {
			text: "Show only nodes (and their edges) whose frontmatter matches ALL expressions. Each line should be a JavaScript expression returning true/false. Access frontmatter properties directly by name. The source node is always shown.",
		});

		// Examples section
		const examplesContainer = desc.createDiv("settings-info-box");
		examplesContainer.createEl("strong", { text: "Example filter expressions:" });
		const examplesList = examplesContainer.createEl("ul");

		const examples = [
			{
				expression: "Status === 'Active'",
				description: "Only show nodes with Status = 'Active'",
			},
			{
				expression: "type === 'project'",
				description: "Only show project-type nodes",
			},
			{
				expression: "Array.isArray(tags) && tags.includes('important')",
				description: "Only show nodes tagged as important",
			},
		];

		for (const example of examples) {
			const li = examplesList.createEl("li", { cls: "color-example-item" });

			li.createEl("code", { text: example.expression, cls: "settings-info-box-example" });

			li.createSpan({ text: "→", cls: "color-arrow" });

			li.createSpan({ text: example.description, cls: "color-example-description" });
		}

		// Warning section
		const warningContainer = desc.createDiv("settings-warning-box");
		warningContainer.createEl("strong", { text: "⚠️ Important:" });
		warningContainer.createEl("p", {
			text: "Access frontmatter properties directly by name. Invalid expressions will be ignored. All expressions must evaluate to true for a node to be shown.",
		});

		this.uiBuilder.addTextArray(containerEl, {
			key: "filterExpressions",
			name: "Filter expressions",
			desc: "One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only nodes matching all expressions are shown in the graph.",
			placeholder: "Status === 'Active'\ntype === 'project'",
			multiline: true,
		});

		// Filter presets section
		new Setting(containerEl).setName("Filter presets").setHeading();

		const presetDesc = containerEl.createDiv();
		presetDesc.createEl("p", {
			text: "Create named filter presets for quick access in the graph. Use the command 'Toggle Graph Filter (Preset Selector)' to show a dropdown with your presets. Selecting a preset fills the filter expression input.",
		});

		// Presets list
		const presetsListContainer = containerEl.createDiv();
		this.renderFilterPresetsList(presetsListContainer);

		// Add new preset button
		new Setting(containerEl)
			.setName("Add filter preset")
			.setDesc("Create a new filter preset")
			.addButton((button) => {
				button.setButtonText("Add Preset");
				button.onClick(async () => {
					const newPreset = {
						name: "",
						expression: "",
					};

					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						filterPresets: [...s.filterPresets, newPreset],
					}));

					this.renderFilterPresetsList(presetsListContainer);
				});
			});
	}

	private renderFilterPresetsList(container: HTMLElement): void {
		container.empty();
		const { filterPresets } = this.plugin.settingsStore.settings$.value;

		if (filterPresets.length === 0) {
			const emptyState = container.createDiv("setting-item-description");
			emptyState.textContent = "No filter presets defined. Click 'Add Preset' to create one.";
			return;
		}

		for (let index = 0; index < filterPresets.length; index++) {
			const preset = filterPresets[index];
			const presetContainer = container.createDiv("filter-preset-item");

			// Name input
			const nameInput = presetContainer.createEl("input", {
				type: "text",
				value: preset.name,
				placeholder: "Preset name (e.g., 'Active Tasks', 'Projects')",
				cls: "filter-preset-name-input",
			});

			const updateName = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					filterPresets: s.filterPresets.map((p, i) => (i === index ? { ...p, name: nameInput.value } : p)),
				}));
			};

			nameInput.addEventListener("blur", updateName);
			nameInput.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					e.preventDefault();
					updateName();
				}
			});

			// Expression input
			const expressionInput = presetContainer.createEl("input", {
				type: "text",
				value: preset.expression,
				placeholder: "Filter expression (e.g., Status === 'Active')",
				cls: "filter-preset-expression-input",
			});

			const updateExpression = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					filterPresets: s.filterPresets.map((p, i) => (i === index ? { ...p, expression: expressionInput.value } : p)),
				}));
			};

			expressionInput.addEventListener("blur", updateExpression);
			expressionInput.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					e.preventDefault();
					updateExpression();
				}
			});

			// Delete button
			const deleteButton = presetContainer.createEl("button", {
				text: "×",
				attr: { title: "Delete preset" },
				cls: "filter-preset-btn-delete",
			});
			deleteButton.onclick = async () => {
				await this.plugin.settingsStore.updateSettings((s) => ({
					...s,
					filterPresets: s.filterPresets.filter((_, i) => i !== index),
				}));
				this.renderFilterPresetsList(container);
			};
		}
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
		this.uiBuilder.addArrayManager(containerEl, {
			key: "directories",
			name: "Directory scanning",
			desc: 'Configure which directories to scan for files with relationships. Use "*" to scan all directories, or specify individual directories to limit scanning.',
			placeholder: "Directory path (e.g., Projects or Notes/Work)",
			addButtonText: "Add",
			removeButtonText: "Remove",
			emptyArrayFallback: "*",
			preventEmpty: true,
			itemDescriptionFn: (item: unknown) => {
				const dir = String(item);
				return dir === "*" ? "Scan all directories" : `Includes all subdirectories: ${dir}/**`;
			},
			onBeforeAdd: async (newItem: unknown, currentItems: unknown[]) => {
				const newDir = String(newItem);
				let newDirs = [...currentItems];

				// If adding a specific directory, remove "*" if it exists
				if (newDir !== "*" && newDirs.includes("*")) {
					newDirs = newDirs.filter((d) => d !== "*");
				}

				// Add the new directory if it doesn't exist
				if (!newDirs.includes(newDir)) {
					newDirs.push(newDir);
				}

				return newDirs;
			},
			onBeforeRemove: async (itemToRemove: unknown, currentItems: unknown[]) => {
				const newDirs = currentItems.filter((d) => d !== itemToRemove);
				// Prevent removing all directories
				return newDirs.length === 0 ? ["*"] : newDirs;
			},
			quickActions: [
				{
					name: "Reset to scan all directories",
					desc: "Clear all specific directories and scan the entire vault",
					buttonText: "Scan all",
					condition: (currentItems: unknown[]) => !currentItems.includes("*"),
					action: async (_currentItems: unknown[]) => ["*"],
				},
			],
		});
	}

	private addDirectRelationshipSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Direct relationship properties").setHeading();

		containerEl
			.createDiv("setting-item-description")
			.setText(
				"Configure property names for direct bidirectional relationships. When you set a relationship in one direction, the plugin automatically updates the reverse relationship."
			);

		this.uiBuilder.addToggle(containerEl, {
			key: "autoLinkSiblings",
			name: "Auto-link siblings",
			desc: "Automatically mark nodes as related when they share the same parent (siblings are related to each other)",
		});

		this.uiBuilder.addText(containerEl, {
			key: "parentProp",
			name: "Parent property",
			desc: "Property name for parent reference (bidirectional with children)",
			placeholder: "parent",
		});

		this.uiBuilder.addText(containerEl, {
			key: "childrenProp",
			name: "Children property",
			desc: "Property name for children references (bidirectional with parent)",
			placeholder: "children",
		});

		this.uiBuilder.addText(containerEl, {
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

		this.uiBuilder.addText(containerEl, {
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
			text: "All frontmatter properties are inherited (except excluded properties)",
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

		// Excluded properties section
		new Setting(containerEl).setName("Excluded properties").setHeading();

		this.uiBuilder.addTextArray(containerEl, {
			key: "defaultExcludedProperties",
			name: "Default excluded properties",
			desc: "Comma-separated list of frontmatter properties to ALWAYS exclude from copying when creating new nodes. These are excluded regardless of any rules below.",
			placeholder: "e.g., Parent, Child, Related, _ZettelID",
		});

		const excludedPropertiesContainer = containerEl.createDiv();

		const desc = excludedPropertiesContainer.createDiv();
		desc.createEl("p", {
			text: "Define path-based rules to exclude ADDITIONAL properties for files in specific directories. The default excluded properties above are always excluded. Rules are evaluated in order - the first matching path's properties are ADDED to the default exclusion list.",
		});

		const examplesContainer = desc.createDiv("settings-info-box");
		examplesContainer.createEl("strong", { text: "Example path-based exclusion rules:" });
		const examplesList = examplesContainer.createEl("ul");

		const examples = [
			{
				path: "Projects/",
				properties: "status, progress",
				description: "Exclude status and progress from files in Projects/",
			},
			{
				path: "Daily Notes/2024/",
				properties: "date, weekday",
				description: "Exclude date fields from files in Daily Notes/2024/",
			},
		];

		for (const example of examples) {
			const li = examplesList.createEl("li", { cls: "color-example-item" });
			li.createEl("code", { text: example.path, cls: "settings-info-box-example" });
			li.createSpan({ text: "→", cls: "color-arrow" });
			li.createEl("code", { text: example.properties, cls: "settings-info-box-example" });
			li.createSpan({ text: `: ${example.description}`, cls: "color-example-description" });
		}

		const warningContainer = desc.createDiv("settings-warning-box");
		warningContainer.createEl("strong", { text: "⚠️ Important:" });
		warningContainer.createEl("p", {
			text: "Path matching uses startsWith - a file matches if its path starts with the rule's path. Default excluded properties are ALWAYS excluded. Path rules ADD additional properties to exclude on top of the defaults.",
		});

		const excludedPropertyRulesListContainer = excludedPropertiesContainer.createDiv();
		this.renderExcludedPropertyRulesList(excludedPropertyRulesListContainer);

		new Setting(excludedPropertiesContainer)
			.setName("Add path-based exclusion rule")
			.setDesc("Add a new rule to exclude properties for files in a specific path")
			.addButton((button) => {
				button.setButtonText("Add Rule");
				button.onClick(async () => {
					const newRule = {
						id: `path-excluded-${Date.now()}`,
						path: "",
						excludedProperties: [],
						enabled: true,
					};

					await this.plugin.settingsStore.updateSettings((s) => ({
						...s,
						pathExcludedProperties: [...s.pathExcludedProperties, newRule],
					}));

					this.renderExcludedPropertyRulesList(excludedPropertyRulesListContainer);
				});
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
