import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import { cls } from "../../../utils/css";

import { createDeleteButton, createMoveButtons, createRuleInput, createRuleToggle, swapRules } from "../controls";
import type { SettingsSection } from "../types";

export class BasesViewSettingsSection implements SettingsSection {
	readonly id = "bases-view";
	readonly label = "Bases";

	private includedPropertyRulesContainer: HTMLElement | null = null;

	constructor(
		private readonly plugin: NexusPropertiesPlugin,
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Bases view configuration").setHeading();

		container
			.createDiv("setting-item-description nexus-properties-section-description")
			.setText(
				"Configure which frontmatter properties appear as columns in the Bases view tables. Properties are displayed in the order specified."
			);

		this.uiBuilder.addToggle(container, {
			key: "excludeArchived",
			name: "Enable archived filtering",
			desc: "When enabled, shows separate archived and non-archived views. When disabled, shows all items without filtering.",
		});

		this.uiBuilder.addText(container, {
			key: "archivedProp",
			name: "Archived property name",
			desc: "Name of the frontmatter property used to mark files as archived (e.g., 'Archived', '_Archived').",
			placeholder: "Archived",
		});

		this.uiBuilder.addTextArray(container, {
			key: "defaultBasesIncludedProperties",
			name: "Default included properties",
			desc: "Comma-separated list of frontmatter properties to include as columns in Bases view tables. 'file.name' is always included first. These properties apply to all files unless overridden by path-based rules below.",
			placeholder: "e.g., status, priority, tags",
		});

		new Setting(container).setName("Custom sorting").setHeading();

		container
			.createDiv("setting-item-description nexus-properties-section-description")
			.setText(
				"Define custom formulas and sort rules for advanced sorting in Bases view tables. Formulas map property values to numeric priorities, and sort rules specify how rows should be ordered."
			);

		new Setting(container)
			.setName("Custom formulas")
			.setDesc(
				"Define custom formulas for sorting. Enter the YAML content that goes AFTER 'formulas:' (do not include 'formulas:' itself). Each formula maps values to sort priorities. Leave empty if not needed."
			)
			.addTextArea((text) => {
				text
					.setPlaceholder(
						`  _priority_sort: |-
    [
      ["Very High", 1],
      ["High", 2],
      ["Medium", 3],
      ["Low", 4],
      ["null", 5]
    ].filter(value[0] == Priority.toString())[0][1]`
					)
					.setValue(this.plugin.settingsStore.currentSettings.basesCustomFormulas)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((current) => ({
							...current,
							basesCustomFormulas: value,
						}));
					});
				text.inputEl.rows = 8;
			});

		new Setting(container)
			.setName("Custom sort configuration")
			.setDesc(
				"Define custom sort rules. Enter the YAML content that goes AFTER 'sort:' (do not include 'sort:' itself). Specifies how to sort table rows. Leave empty if not needed."
			)
			.addTextArea((text) => {
				text
					.setPlaceholder(
						`      - property: formula._priority_sort
        direction: ASC
      - property: file.mtime
        direction: DESC`
					)
					.setValue(this.plugin.settingsStore.currentSettings.basesCustomSort)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((current) => ({
							...current,
							basesCustomSort: value,
						}));
					});
				text.inputEl.rows = 6;
			});

		const includedPropertiesContainer = container.createDiv(cls("settings-subsection"));

		const description = includedPropertiesContainer.createDiv("setting-item-description");
		description.createEl("p", {
			text: "Define path-based rules to include ADDITIONAL properties as columns for files in specific directories. The default properties above are always included. Rules are evaluated in order - the first matching path's properties are ADDED to the default list.",
		});

		const examplesContainer = description.createDiv(cls("settings-info-box"));
		examplesContainer.createEl("strong", {
			text: "Example path-based inclusion rules:",
		});
		const examplesList = examplesContainer.createEl("ul");

		const examples = [
			{
				path: "Projects/",
				properties: "deadline, assignee",
				description: "Show deadline and assignee columns for files in Projects/",
			},
			{
				path: "Daily Notes/",
				properties: "mood, weather",
				description: "Show mood and weather columns for files in Daily Notes/",
			},
		];

		for (const example of examples) {
			const listItem = examplesList.createEl("li", {
				cls: cls("color-example-item"),
			});
			listItem.createEl("code", {
				text: example.path,
				cls: cls("settings-info-box-example"),
			});
			listItem.createSpan({ text: "→", cls: cls("color-arrow") });
			listItem.createEl("code", {
				text: example.properties,
				cls: cls("settings-info-box-example"),
			});
			listItem.createSpan({
				text: `: ${example.description}`,
				cls: cls("color-example-description"),
			});
		}

		const infoBox = description.createDiv(cls("settings-info-box"));
		infoBox.createEl("strong", { text: "Column order:" });
		const orderList = infoBox.createEl("ol");
		orderList.createEl("li", { text: "file.name (always first)" });
		orderList.createEl("li", {
			text: "Default included properties (in order specified)",
		});
		orderList.createEl("li", {
			text: "Path-specific properties (in order specified)",
		});

		const warning = description.createDiv(cls("settings-warning-box"));
		warning.createEl("strong", { text: "⚠️ Important:" });
		warning.createEl("p", {
			text: "Path matching uses startsWith - a file matches if its path starts with the rule's path. Default properties are ALWAYS included. Path rules ADD additional columns on top of the defaults.",
		});

		this.includedPropertyRulesContainer = includedPropertiesContainer.createDiv();
		this.renderIncludedPropertyRulesList();

		new Setting(includedPropertiesContainer)
			.setName("Add path-based inclusion rule")
			.setDesc("Add a new rule to include additional properties for files in a specific path")
			.addButton((button) => {
				button.setButtonText("Add Rule");
				button.onClick(async () => {
					const newRule = {
						id: `path-included-${Date.now()}`,
						path: "",
						includedProperties: [] as string[],
						enabled: true,
					};

					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathBasesIncludedProperties: [...current.pathBasesIncludedProperties, newRule],
					}));

					this.renderIncludedPropertyRulesList();
				});
			});
	}

	private renderIncludedPropertyRulesList(): void {
		if (!this.includedPropertyRulesContainer) {
			return;
		}

		this.includedPropertyRulesContainer.empty();
		const { pathBasesIncludedProperties } = this.plugin.settingsStore.currentSettings;

		if (pathBasesIncludedProperties.length === 0) {
			const emptyState = this.includedPropertyRulesContainer.createDiv(cls("settings-empty-state"));
			emptyState.textContent =
				"No path-based inclusion rules defined. Click 'Add Rule' to create one. Default included properties will be used for all files.";
			return;
		}

		pathBasesIncludedProperties.forEach((rule, index) => {
			const ruleContainer = this.includedPropertyRulesContainer!.createDiv(cls("color-rule-item"));
			const mainRow = ruleContainer.createDiv(cls("color-rule-main-row"));
			const leftSection = mainRow.createDiv(cls("color-rule-left"));

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: cls("color-rule-order"),
			});

			const toggle = createRuleToggle(rule.enabled, async (checked) => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					pathBasesIncludedProperties: current.pathBasesIncludedProperties.map((existingRule) =>
						existingRule.id === rule.id ? { ...existingRule, enabled: checked } : existingRule
					),
				}));
			});
			leftSection.appendChild(toggle);

			const pathInput = createRuleInput(rule.path, "Projects/", cls("color-rule-expression-input"), async (value) => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					pathBasesIncludedProperties: current.pathBasesIncludedProperties.map((existingRule) =>
						existingRule.id === rule.id ? { ...existingRule, path: value } : existingRule
					),
				}));
			});
			leftSection.appendChild(pathInput);

			const rightSection = mainRow.createDiv(cls("color-rule-right"));
			const propertiesInput = createRuleInput(
				rule.includedProperties.join(", "),
				"status, priority, tags",
				cls("included-properties-input"),
				async (value) => {
					const propertiesArray = value
						.split(",")
						.map((property) => property.trim())
						.filter((property) => property.length > 0);

					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathBasesIncludedProperties: current.pathBasesIncludedProperties.map((existingRule) =>
							existingRule.id === rule.id ? { ...existingRule, includedProperties: propertiesArray } : existingRule
						),
					}));
				}
			);
			rightSection.appendChild(propertiesInput);

			const controlsSection = rightSection.createDiv(cls("color-rule-controls"));
			createMoveButtons({
				container: controlsSection,
				index,
				totalCount: pathBasesIncludedProperties.length,
				onMoveUp: async () => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathBasesIncludedProperties: swapRules(current.pathBasesIncludedProperties, rule.id, -1),
					}));
					this.renderIncludedPropertyRulesList();
				},
				onMoveDown: async () => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathBasesIncludedProperties: swapRules(current.pathBasesIncludedProperties, rule.id, 1),
					}));
					this.renderIncludedPropertyRulesList();
				},
			});

			createDeleteButton(controlsSection, async () => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					pathBasesIncludedProperties: current.pathBasesIncludedProperties.filter(
						(existingRule) => existingRule.id !== rule.id
					),
				}));
				this.renderIncludedPropertyRulesList();
			});
		});
	}
}
