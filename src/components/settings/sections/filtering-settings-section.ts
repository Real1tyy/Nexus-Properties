import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

export class FilteringSettingsSection implements SettingsSection {
	readonly id = "filtering";
	readonly label = "Graph Filtering";

	private filterPresetsContainer: HTMLElement | null = null;

	constructor(
		private readonly plugin: NexusPropertiesPlugin,
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
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
				})();
			};
		});
	}
}
