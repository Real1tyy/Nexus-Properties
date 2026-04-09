import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { NexusPropertiesSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

const S = NexusPropertiesSettingsSchema.shape;

export class GraphDisplaySettingsSection implements SettingsSection {
	readonly id = "graph-display";
	readonly label = "Graph";

	constructor(private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Graph").setHeading();

		this.uiBuilder.addSchemaField(
			container,
			{ showSearchBar: S.showSearchBar },
			{ label: "Show search bar by default" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ showFilterBar: S.showFilterBar },
			{ label: "Show filter bar by default" }
		);

		this.uiBuilder.addSchemaField(container, { showZoomIndicator: S.showZoomIndicator });

		this.uiBuilder.addSchemaField(
			container,
			{ maintainIndirectConnections: S.maintainIndirectConnections },
			{ label: "Maintain indirect connections when filtering" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ graphEnlargedWidthPercent: S.graphEnlargedWidthPercent },
			{ label: "Graph enlarged width" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ graphZoomPreviewHeight: S.graphZoomPreviewHeight },
			{ label: "Zoom preview height", step: 10 }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ graphZoomPreviewFrontmatterHeight: S.graphZoomPreviewFrontmatterHeight },
			{ step: 5 }
		);

		new Setting(container).setName("Mobile").setHeading();

		this.uiBuilder.addSchemaField(
			container,
			{ mobileFrontmatterPropertyWidth: S.mobileFrontmatterPropertyWidth },
			{ step: 5 }
		);

		new Setting(container).setName("Animation").setHeading();

		this.uiBuilder.addSchemaField(container, { graphAnimationDuration: S.graphAnimationDuration }, { step: 50 });

		this.uiBuilder.addSchemaField(
			container,
			{ allRelatedMaxDepth: S.allRelatedMaxDepth },
			{ label: "All Related recursion depth" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ hierarchyMaxDepth: S.hierarchyMaxDepth },
			{ label: "Hierarchy traversal depth" }
		);

		new Setting(container).setName("Layout").setHeading();

		this.uiBuilder.addSchemaField(
			container,
			{ useMultiRowLayout: S.useMultiRowLayout },
			{ label: "Use multi-row layout for large families" }
		);

		this.uiBuilder.addSchemaField(container, { maxChildrenPerRow: S.maxChildrenPerRow });

		this.uiBuilder.addSchemaField(
			container,
			{ displayNodeProperties: S.displayNodeProperties },
			{ label: "Display properties in nodes", placeholder: "e.g., status, priority" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ showGraphTooltips: S.showGraphTooltips },
			{ label: "Show node tooltips" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ graphTooltipWidth: S.graphTooltipWidth },
			{ label: "Tooltip width", step: 5 }
		);
	}
}
