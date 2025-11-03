import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import { SETTINGS_DEFAULTS } from "src/types/constants";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

import { createDeleteButton, createMoveButtons, createRuleInput, createRuleToggle, swapRules } from "../controls";
import type { SettingsSection } from "../types";

export class RulesSection implements SettingsSection {
	readonly id = "rules";
	readonly label = "Rules";

	private colorRulesListContainer: HTMLElement | null = null;
	private filterPresetsContainer: HTMLElement | null = null;
	private preFillPresetContainer: HTMLElement | null = null;

	constructor(
		private readonly plugin: NexusPropertiesPlugin,
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		this.renderColorRules(container);
		this.renderFilteringRules(container);
	}

	private renderColorRules(container: HTMLElement): void {
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(container).setName("Node colors").setHeading();

		new Setting(container)
			.setName("Default node color")
			.setDesc("Default color for nodes when no color rules match")
			.addColorPicker((colorPicker) => {
				colorPicker.setValue(settings.defaultNodeColor);
				colorPicker.onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						defaultNodeColor: value || SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR,
					}));
				});
			});

		const colorRulesContainer = container.createDiv();
		const descriptionContainer = colorRulesContainer.createDiv();
		descriptionContainer.createEl("p", {
			text: "Define color rules based on frontmatter properties. Rules are evaluated in order - the first matching rule determines the node color.",
		});

		const examplesContainer = descriptionContainer.createDiv("settings-info-box");
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
			const listItem = examplesList.createEl("li", { cls: "color-example-item" });
			listItem.createEl("code", { text: example.expression, cls: "settings-info-box-example" });
			listItem.createSpan({ text: "→", cls: "color-arrow" });
			const colorSpan = listItem.createEl("span", { cls: "color-example-dot" });
			colorSpan.style.setProperty("--example-color", example.color);
			listItem.createSpan({ text: example.description, cls: "color-example-description" });
		}

		const warningContainer = descriptionContainer.createDiv("settings-warning-box");
		warningContainer.createEl("strong", { text: "⚠️ Important:" });
		warningContainer.createEl("p", {
			text: "Access frontmatter properties directly by name. Invalid expressions will be ignored. Colors can be CSS color names, hex codes, or HSL values.",
		});

		this.colorRulesListContainer = colorRulesContainer.createDiv();
		this.renderColorRulesList();

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

					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						colorRules: [...current.colorRules, newRule],
					}));

					this.renderColorRulesList();
				});
			});
	}

	private addPreFillPresetSelector(container: HTMLElement): void {
		// Create info box explaining the difference
		const infoContainer = container.createDiv("settings-info-box");
		infoContainer.createEl("strong", { text: "Pre-fill vs Default Filters:" });
		const infoList = infoContainer.createEl("ul");
		infoList.createEl("li", {
			text: "Filter expressions above are default filters - always applied and cannot be toggled off",
		});
		infoList.createEl("li", {
			text: "Pre-fill preset below is optional - fills the filter input on startup but can be cleared by the user",
		});

		// Store reference for re-rendering
		this.preFillPresetContainer = container.createDiv();
		this.renderPreFillPresetDropdown();
	}

	private renderPreFillPresetDropdown(): void {
		if (!this.preFillPresetContainer) return;

		this.preFillPresetContainer.empty();
		const settings = this.plugin.settingsStore.currentSettings;

		new Setting(this.preFillPresetContainer)
			.setName("Pre-fill filter preset")
			.setDesc(
				"Automatically fill the filter input with this preset when the graph opens. Users can clear or modify it."
			)
			.addDropdown((dropdown) => {
				// Add empty option
				dropdown.addOption("", "None");

				// Add all filter presets
				settings.filterPresets.forEach((preset) => {
					if (preset.name) {
						dropdown.addOption(preset.name, preset.name);
					}
				});

				dropdown.setValue(settings.preFillFilterPreset);

				dropdown.onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						preFillFilterPreset: value,
					}));
				});
			});
	}

	private renderFilteringRules(container: HTMLElement): void {
		new Setting(container).setName("Graph filtering").setHeading();

		const description = container.createDiv();
		description.createEl("p", {
			text: "Show only nodes (and their edges) whose frontmatter matches ALL expressions. Each line should be a JavaScript expression returning true/false. Access frontmatter properties directly by name. The source node is always shown.",
		});

		const examplesContainer = description.createDiv("settings-info-box");
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
			const listItem = examplesList.createEl("li", { cls: "color-example-item" });
			listItem.createEl("code", { text: example.expression, cls: "settings-info-box-example" });
			listItem.createSpan({ text: "→", cls: "color-arrow" });
			listItem.createSpan({ text: example.description, cls: "color-example-description" });
		}

		const warningContainer = description.createDiv("settings-warning-box");
		warningContainer.createEl("strong", { text: "⚠️ Important:" });
		warningContainer.createEl("p", {
			text: "Access frontmatter properties directly by name. Invalid expressions will be ignored. All expressions must evaluate to true for a node to be shown.",
		});

		this.uiBuilder.addTextArray(container, {
			key: "filterExpressions",
			name: "Filter expressions",
			desc: "One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only nodes matching all expressions are shown in the graph.",
			placeholder: "Status === 'Active'\ntype === 'project'",
			multiline: true,
		});

		// Add pre-fill preset selector
		this.addPreFillPresetSelector(container);

		new Setting(container).setName("Filter presets").setHeading();

		const presetDescription = container.createDiv();
		presetDescription.createEl("p", {
			text: "Create named filter presets for quick access in the graph. Use the command 'Toggle Graph Filter (Preset Selector)' to show a dropdown with your presets. Selecting a preset fills the filter expression input.",
		});

		this.filterPresetsContainer = container.createDiv();
		this.renderFilterPresetsList();

		new Setting(container)
			.setName("Add filter preset")
			.setDesc("Create a new filter preset")
			.addButton((button) => {
				button.setButtonText("Add Preset");
				button.onClick(async () => {
					const newPreset = { name: "", expression: "" };

					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						filterPresets: [...current.filterPresets, newPreset],
					}));

					this.renderFilterPresetsList();
					this.renderPreFillPresetDropdown();
				});
			});
	}

	private renderColorRulesList(): void {
		if (!this.colorRulesListContainer) {
			return;
		}

		this.colorRulesListContainer.empty();
		const { colorRules } = this.plugin.settingsStore.currentSettings;

		if (colorRules.length === 0) {
			const emptyState = this.colorRulesListContainer.createDiv();
			emptyState.textContent = "No color rules defined. Click 'Add Rule' to create one.";
			return;
		}

		colorRules.forEach((rule, index) => {
			const ruleContainer = this.colorRulesListContainer!.createDiv("color-rule-item");
			const mainRow = ruleContainer.createDiv("color-rule-main-row");
			const leftSection = mainRow.createDiv("color-rule-left");

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: "color-rule-order",
			});

			const enableToggle = createRuleToggle(rule.enabled, async (checked) => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					colorRules: current.colorRules.map((existingRule) =>
						existingRule.id === rule.id ? { ...existingRule, enabled: checked } : existingRule
					),
				}));
			});
			leftSection.appendChild(enableToggle);

			const expressionInput = createRuleInput(
				rule.expression,
				"fm.Status === 'Active'",
				"color-rule-expression-input",
				async (value) => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						colorRules: current.colorRules.map((existingRule) =>
							existingRule.id === rule.id ? { ...existingRule, expression: value } : existingRule
						),
					}));
				}
			);
			leftSection.appendChild(expressionInput);

			const rightSection = mainRow.createDiv("color-rule-right");
			const colorPickerWrapper = rightSection.createDiv("color-rule-picker-wrapper");

			new Setting(colorPickerWrapper).addColorPicker((colorPicker) => {
				colorPicker.setValue(rule.color);
				colorPicker.onChange(async (value) => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						colorRules: current.colorRules.map((existingRule) =>
							existingRule.id === rule.id ? { ...existingRule, color: value } : existingRule
						),
					}));
				});
			});

			const controlsSection = rightSection.createDiv("color-rule-controls");

			createMoveButtons({
				container: controlsSection,
				index,
				totalCount: colorRules.length,
				onMoveUp: async () => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						colorRules: swapRules(current.colorRules, rule.id, -1),
					}));
					this.renderColorRulesList();
				},
				onMoveDown: async () => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						colorRules: swapRules(current.colorRules, rule.id, 1),
					}));
					this.renderColorRulesList();
				},
			});

			createDeleteButton(controlsSection, async () => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					colorRules: current.colorRules.filter((existingRule) => existingRule.id !== rule.id),
				}));
				this.renderColorRulesList();
			});
		});
	}

	private renderFilterPresetsList(): void {
		if (!this.filterPresetsContainer) {
			return;
		}

		this.filterPresetsContainer.empty();
		const { filterPresets } = this.plugin.settingsStore.settings$.value;

		if (filterPresets.length === 0) {
			const emptyState = this.filterPresetsContainer.createDiv("setting-item-description");
			emptyState.textContent = "No filter presets defined. Click 'Add Preset' to create one.";
			return;
		}

		filterPresets.forEach((preset, index) => {
			const presetContainer = this.filterPresetsContainer!.createDiv("filter-preset-item");

			const nameInput = presetContainer.createEl("input", {
				type: "text",
				value: preset.name,
				placeholder: "Preset name (e.g., 'Active Tasks', 'Projects')",
				cls: "filter-preset-name-input",
			});

			const updateName = async () => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					filterPresets: current.filterPresets.map((existing, presetIndex) =>
						presetIndex === index ? { ...existing, name: nameInput.value } : existing
					),
				}));
			};

			nameInput.addEventListener("blur", () => {
				void updateName();
			});
			nameInput.addEventListener("keydown", (event: KeyboardEvent) => {
				if (event.key === "Enter") {
					event.preventDefault();
					void updateName();
				}
			});

			const expressionInput = presetContainer.createEl("input", {
				type: "text",
				value: preset.expression,
				placeholder: "Filter expression (e.g., Status === 'Active')",
				cls: "filter-preset-expression-input",
			});

			const updateExpression = async () => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					filterPresets: current.filterPresets.map((existing, presetIndex) =>
						presetIndex === index ? { ...existing, expression: expressionInput.value } : existing
					),
				}));
			};

			expressionInput.addEventListener("blur", () => {
				void updateExpression();
			});
			expressionInput.addEventListener("keydown", (event: KeyboardEvent) => {
				if (event.key === "Enter") {
					event.preventDefault();
					void updateExpression();
				}
			});

			const deleteButton = presetContainer.createEl("button", {
				text: "×",
				attr: { title: "Delete preset" },
				cls: "filter-preset-btn-delete",
			});

			deleteButton.onclick = () => {
				void (async () => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						filterPresets: current.filterPresets.filter((_, presetIndex) => presetIndex !== index),
					}));
					this.renderFilterPresetsList();
					this.renderPreFillPresetDropdown();
				})();
			};
		});
	}
}
