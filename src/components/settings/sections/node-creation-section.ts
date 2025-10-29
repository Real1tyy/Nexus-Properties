import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

import { createDeleteButton, createMoveButtons, createRuleInput, createRuleToggle, swapRules } from "../controls";
import type { SettingsSection } from "../types";

export class NodeCreationSettingsSection implements SettingsSection {
	readonly id = "node-creation";
	readonly label = "Node Creation";

	private excludedPropertyRulesContainer: HTMLElement | null = null;

	constructor(
		private readonly plugin: NexusPropertiesPlugin,
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Node creation shortcuts").setHeading();

		container
			.createDiv("setting-item-description")
			.setText(
				"Enable quick creation of Parent, Child, and Related nodes from the command palette. New nodes inherit frontmatter properties and automatically establish bidirectional relationships."
			);

		this.uiBuilder.addText(container, {
			key: "zettelIdProp",
			name: "Zettel ID property",
			desc: "Property name for unique timestamp identifier assigned to new nodes",
			placeholder: "_ZettelID",
		});

		const infoBox = container.createDiv("settings-info-box");
		infoBox.createEl("strong", { text: "How it works:" });
		const list = infoBox.createEl("ul");
		list.createEl("li", { text: "New nodes are created in the same folder as the source file" });
		list.createEl("li", { text: "All frontmatter properties are inherited (except excluded properties)" });
		list.createEl("li", { text: "A new Zettel ID is generated automatically (timestamp-based)" });
		list.createEl("li", { text: "Bidirectional relationships are established automatically" });
		list.createEl("li", { text: "Commands are only available for files in indexed directories" });

		new Setting(container).setName("Excluded properties").setHeading();

		this.uiBuilder.addTextArray(container, {
			key: "defaultExcludedProperties",
			name: "Default excluded properties",
			desc: "Comma-separated list of frontmatter properties to ALWAYS exclude from copying when creating new nodes. These are excluded regardless of any rules below.",
			placeholder: "e.g., Parent, Child, Related, _ZettelID",
		});

		const excludedPropertiesContainer = container.createDiv();

		const description = excludedPropertiesContainer.createDiv();
		description.createEl("p", {
			text: "Define path-based rules to exclude ADDITIONAL properties for files in specific directories. The default excluded properties above are always excluded. Rules are evaluated in order - the first matching path's properties are ADDED to the default exclusion list.",
		});

		const examplesContainer = description.createDiv("settings-info-box");
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
			const listItem = examplesList.createEl("li", { cls: "color-example-item" });
			listItem.createEl("code", { text: example.path, cls: "settings-info-box-example" });
			listItem.createSpan({ text: "→", cls: "color-arrow" });
			listItem.createEl("code", { text: example.properties, cls: "settings-info-box-example" });
			listItem.createSpan({ text: `: ${example.description}`, cls: "color-example-description" });
		}

		const warning = description.createDiv("settings-warning-box");
		warning.createEl("strong", { text: "⚠️ Important:" });
		warning.createEl("p", {
			text: "Path matching uses startsWith - a file matches if its path starts with the rule's path. Default excluded properties are ALWAYS excluded. Path rules ADD additional properties to exclude on top of the defaults.",
		});

		this.excludedPropertyRulesContainer = excludedPropertiesContainer.createDiv();
		this.renderExcludedPropertyRulesList();

		new Setting(excludedPropertiesContainer)
			.setName("Add path-based exclusion rule")
			.setDesc("Add a new rule to exclude properties for files in a specific path")
			.addButton((button) => {
				button.setButtonText("Add Rule");
				button.onClick(async () => {
					const newRule = {
						id: `path-excluded-${Date.now()}`,
						path: "",
						excludedProperties: [] as string[],
						enabled: true,
					};

					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathExcludedProperties: [...current.pathExcludedProperties, newRule],
					}));

					this.renderExcludedPropertyRulesList();
				});
			});
	}

	private renderExcludedPropertyRulesList(): void {
		if (!this.excludedPropertyRulesContainer) {
			return;
		}

		this.excludedPropertyRulesContainer.empty();
		const { pathExcludedProperties } = this.plugin.settingsStore.currentSettings;

		if (pathExcludedProperties.length === 0) {
			const emptyState = this.excludedPropertyRulesContainer.createDiv();
			emptyState.textContent =
				"No path-based exclusion rules defined. Click 'Add Rule' to create one. Default excluded properties will be used for all files.";
			return;
		}

		pathExcludedProperties.forEach((rule, index) => {
			const ruleContainer = this.excludedPropertyRulesContainer!.createDiv("color-rule-item");
			const mainRow = ruleContainer.createDiv("color-rule-main-row");
			const leftSection = mainRow.createDiv("color-rule-left");

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: "color-rule-order",
			});

			const toggle = createRuleToggle(rule.enabled, async (checked) => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					pathExcludedProperties: current.pathExcludedProperties.map((existingRule) =>
						existingRule.id === rule.id ? { ...existingRule, enabled: checked } : existingRule
					),
				}));
			});
			leftSection.appendChild(toggle);

			const pathInput = createRuleInput(rule.path, "Projects/", "color-rule-expression-input", async (value) => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					pathExcludedProperties: current.pathExcludedProperties.map((existingRule) =>
						existingRule.id === rule.id ? { ...existingRule, path: value } : existingRule
					),
				}));
			});
			leftSection.appendChild(pathInput);

			const rightSection = mainRow.createDiv("color-rule-right");
			const propertiesInput = createRuleInput(
				rule.excludedProperties.join(", "),
				"status, progress, date",
				"excluded-properties-input",
				async (value) => {
					const propertiesArray = value
						.split(",")
						.map((property) => property.trim())
						.filter((property) => property.length > 0);

					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathExcludedProperties: current.pathExcludedProperties.map((existingRule) =>
							existingRule.id === rule.id ? { ...existingRule, excludedProperties: propertiesArray } : existingRule
						),
					}));
				}
			);
			rightSection.appendChild(propertiesInput);

			const controlsSection = rightSection.createDiv("color-rule-controls");
			createMoveButtons({
				container: controlsSection,
				index,
				totalCount: pathExcludedProperties.length,
				onMoveUp: async () => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathExcludedProperties: swapRules(current.pathExcludedProperties, rule.id, -1),
					}));
					this.renderExcludedPropertyRulesList();
				},
				onMoveDown: async () => {
					await this.plugin.settingsStore.updateSettings((current) => ({
						...current,
						pathExcludedProperties: swapRules(current.pathExcludedProperties, rule.id, 1),
					}));
					this.renderExcludedPropertyRulesList();
				},
			});

			createDeleteButton(controlsSection, async () => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					pathExcludedProperties: current.pathExcludedProperties.filter((existingRule) => existingRule.id !== rule.id),
				}));
				this.renderExcludedPropertyRulesList();
			});
		});
	}
}
