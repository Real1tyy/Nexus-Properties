import { Setting } from "obsidian";
import type NexusPropertiesPlugin from "src/main";

import { computeVaultStatistics, createObsidianLinkResolver } from "../../../utils/vault-statistics";
import type { SettingsSection } from "../types";

export class StatisticsSection implements SettingsSection {
	readonly id = "statistics";
	readonly label = "Statistics";

	constructor(private readonly plugin: NexusPropertiesPlugin) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Vault Statistics").setHeading();

		const cache = this.plugin.indexer.getRelationshipsSnapshot();
		const resolveLink = createObsidianLinkResolver(this.plugin.app, cache);
		const stats = computeVaultStatistics(cache, resolveLink);

		const items: { name: string; value: string }[] = [
			{ name: "Total Indexed Nodes", value: String(stats.totalNodes) },
			{ name: "Trees (Roots)", value: String(stats.treeCount) },
			{ name: "Average Tree Depth", value: String(stats.avgDepth) },
			{ name: "Max Tree Depth", value: String(stats.maxDepth) },
			{ name: "Nodes with Parents", value: String(stats.nodesWithParents) },
			{ name: "Nodes with Children", value: String(stats.nodesWithChildren) },
			{ name: "Nodes with Related", value: String(stats.nodesWithRelated) },
		];

		for (const item of items) {
			new Setting(container).setName(item.name).setDesc(item.value);
		}
	}
}
