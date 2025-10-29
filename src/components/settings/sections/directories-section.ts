import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

export class DirectoriesSection implements SettingsSection {
	readonly id = "directories";
	readonly label = "Directories";

	constructor(
		private readonly plugin: NexusPropertiesPlugin,
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		// Directory Scanning Section
		new Setting(container).setName("Directory scanning").setHeading();

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

		const description = container.createDiv("setting-item-description");
		description.setText(
			"Manually index all files in your vault and assign relationship properties based on your configured settings. This process will scan all files in the configured directories and update their frontmatter with bidirectional and computed relationships."
		);

		new Setting(container)
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
}
