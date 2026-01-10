import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import { cls } from "../../../utils/css";

import { createDeleteButton, createMoveButtons, createRuleInput, createRuleToggle, swapRules } from "../controls";
import type { SettingsSection } from "../types";

export class GeneralSection implements SettingsSection {
	readonly id = "general";
	readonly label = "General";

	private excludedPropertyRulesContainer: HTMLElement | null = null;
	private container: HTMLElement | null = null;

	constructor(
		private readonly plugin: NexusPropertiesPlugin,
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		this.container = container;

		// User Interface Section
		new Setting(container).setName("User Interface").setHeading();

		this.uiBuilder.addToggle(container, {
			key: "showRibbonIcon",
			name: "Show ribbon icon",
			desc: "Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.",
		});

		this.uiBuilder.addToggle(container, {
			key: "showViewSwitcherHeader",
			name: "Show view switcher header",
			desc: "Display the header with toggle button in the Nexus Properties view. Changes apply immediately.",
		});

		this.uiBuilder.addToggle(container, {
			key: "showSimpleStatistics",
			name: "Show simple statistics",
			desc: "Display direct parent, children, and related counts in the view switcher header.",
		});

		this.uiBuilder.addToggle(container, {
			key: "showRecursiveStatistics",
			name: "Show recursive statistics",
			desc: "Display recursive (all) parent, children, and related counts in the view switcher header.",
		});

		this.uiBuilder.addArrayManager(container, {
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

				if (newDir !== "*" && newDirs.includes("*")) {
					newDirs = newDirs.filter((dir) => dir !== "*");
				}

				if (!newDirs.includes(newDir)) {
					newDirs.push(newDir);
				}

				return newDirs;
			},
			onBeforeRemove: async (itemToRemove: unknown, currentItems: unknown[]) => {
				const newDirs = currentItems.filter((dir) => dir !== itemToRemove);
				return newDirs.length === 0 ? ["*"] : newDirs;
			},
			quickActions: [
				{
					name: "Reset to scan all directories",
					desc: "Clear all specific directories and scan the entire vault",
					buttonText: "Scan all",
					condition: (currentItems: unknown[]) => !currentItems.includes("*"),
					action: async () => ["*"],
				},
			],
		});

		// Indexing Section
		new Setting(container).setName("Manual indexing").setHeading();

		new Setting(container)
			.setName("Index and assign properties to all files")
			.setDesc("Scan all files in configured directories and update their relationship properties.")
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

		// Frontmatter Propagation Section
		new Setting(container).setName("Frontmatter propagation").setHeading();

		new Setting(container)
			.setName("Propagate frontmatter to children")
			.setDesc(
				"Automatically propagate frontmatter changes from parent files to all child files recursively. When you update custom properties (like status, priority, tags) in a parent file, all descendants are updated immediately."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settingsStore.currentSettings.propagateFrontmatterToChildren)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							propagateFrontmatterToChildren: value,
							askBeforePropagatingFrontmatter: value ? false : s.askBeforePropagatingFrontmatter,
						}));
						this.rerender();
					});
			});

		new Setting(container)
			.setName("Ask before propagating")
			.setDesc(
				"Show a confirmation modal before propagating frontmatter changes to children. Allows you to review changes before applying them to all descendant files."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settingsStore.currentSettings.askBeforePropagatingFrontmatter)
					.onChange(async (value) => {
						await this.plugin.settingsStore.updateSettings((s) => ({
							...s,
							askBeforePropagatingFrontmatter: value,
							propagateFrontmatterToChildren: value ? false : s.propagateFrontmatterToChildren,
						}));
						this.rerender();
					});
			});

		this.uiBuilder.addText(container, {
			key: "excludedPropagatedProps",
			name: "Excluded propagation properties",
			desc: "Comma-separated list of frontmatter property names to exclude from propagation. These properties will not be copied to child files. Relationship properties (Parent, Child, Related, _ZettelID) are always excluded automatically.",
			placeholder: "status, archived, date",
		});

		this.uiBuilder.addSlider(container, {
			key: "propagationDebounceMs",
			name: "Propagation debounce delay",
			desc: "Delay in milliseconds before propagating frontmatter changes to children. Multiple rapid changes within this window will be accumulated and applied together.",
			min: 100,
			max: 10000,
			step: 100,
		});

		new Setting(container).setName("Excluded properties").setHeading();

		this.uiBuilder.addTextArray(container, {
			key: "defaultExcludedProperties",
			name: "Default excluded properties",
			desc: "Comma-separated list of frontmatter properties to ALWAYS exclude from copying when creating new nodes. These are excluded regardless of any rules below.",
			placeholder: "e.g., Parent, Child, Related, _ZettelID",
		});

		const excludedPropertiesContainer = container.createDiv(cls("settings-subsection"));

		const description = excludedPropertiesContainer.createDiv("setting-item-description");
		description.createEl("p", {
			text: "Add rules to exclude extra properties for files in specific folders. These rules add to the default excluded properties above.",
		});

		this.excludedPropertyRulesContainer = excludedPropertiesContainer.createDiv();
		this.renderExcludedPropertyRulesList();

		new Setting(excludedPropertiesContainer)
			.setName("Add exclusion rule")
			.setDesc("Exclude additional properties for files in a specific folder")
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

	private rerender(): void {
		if (!this.container) {
			return;
		}
		this.container.empty();
		this.render(this.container);
	}

	private renderExcludedPropertyRulesList(): void {
		if (!this.excludedPropertyRulesContainer) {
			return;
		}

		this.excludedPropertyRulesContainer.empty();
		const { pathExcludedProperties } = this.plugin.settingsStore.currentSettings;

		if (pathExcludedProperties.length === 0) {
			const emptyState = this.excludedPropertyRulesContainer.createDiv(cls("settings-empty-state"));
			emptyState.textContent = "No rules defined. Click 'Add Rule' to create one.";
			return;
		}

		pathExcludedProperties.forEach((rule, index) => {
			const ruleContainer = this.excludedPropertyRulesContainer!.createDiv(cls("color-rule-item"));
			const mainRow = ruleContainer.createDiv(cls("color-rule-main-row"));
			const leftSection = mainRow.createDiv(cls("color-rule-left"));

			leftSection.createEl("span", {
				text: `#${index + 1}`,
				cls: cls("color-rule-order"),
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

			const pathInput = createRuleInput(rule.path, "Projects/", cls("color-rule-expression-input"), async (value) => {
				await this.plugin.settingsStore.updateSettings((current) => ({
					...current,
					pathExcludedProperties: current.pathExcludedProperties.map((existingRule) =>
						existingRule.id === rule.id ? { ...existingRule, path: value } : existingRule
					),
				}));
			});
			leftSection.appendChild(pathInput);

			const rightSection = mainRow.createDiv(cls("color-rule-right"));
			const propertiesInput = createRuleInput(
				rule.excludedProperties.join(", "),
				"status, progress, date",
				cls("excluded-properties-input"),
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

			const controlsSection = rightSection.createDiv(cls("color-rule-controls"));
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
