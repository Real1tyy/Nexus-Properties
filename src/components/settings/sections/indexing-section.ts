import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";

import type { SettingsSection } from "../types";

export class IndexingSection implements SettingsSection {
	readonly id = "indexing";
	readonly label = "Indexing";

	constructor(private readonly plugin: NexusPropertiesPlugin) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Indexing").setHeading();

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
