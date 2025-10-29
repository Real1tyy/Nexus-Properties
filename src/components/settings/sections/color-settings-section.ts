import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import { SETTINGS_DEFAULTS } from "src/types/constants";

import { createDeleteButton, createMoveButtons, createRuleInput, createRuleToggle, swapRules } from "../controls";
import type { SettingsSection } from "../types";

export class ColorSettingsSection implements SettingsSection {
	readonly id = "color-settings";
	readonly label = "Node Colors";

	private colorRulesListContainer: HTMLElement | null = null;

	constructor(private readonly plugin: NexusPropertiesPlugin) {}

	render(container: HTMLElement): void {
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
}
