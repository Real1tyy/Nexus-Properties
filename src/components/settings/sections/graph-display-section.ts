import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";

import type { SettingsSection } from "../types";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

export class GraphDisplaySettingsSection implements SettingsSection {
	readonly id = "graph-display";
	readonly label = "Graph Display";

	constructor(
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Graph Display").setHeading();

		this.uiBuilder.addToggle(container, {
			key: "showSearchBar",
			name: "Show search bar by default",
			desc: "Display the search bar in the graph view when it loads. You can still toggle it with the command.",
		});

		this.uiBuilder.addToggle(container, {
			key: "showFilterBar",
			name: "Show filter bar by default",
			desc: "Display the filter bar (preset selector and expression input) in the graph view when it loads. You can still toggle it with commands.",
		});

		this.uiBuilder.addSlider(container, {
			key: "graphEnlargedWidthPercent",
			name: "Graph enlarged width",
			desc: "Percentage of window width when graph is enlarged",
			min: 50,
			max: 100,
			step: 1,
		});

		this.uiBuilder.addSlider(container, {
			key: "graphZoomPreviewHeight",
			name: "Zoom preview height",
			desc: "Maximum height in pixels for the zoom preview panel",
			min: 120,
			max: 700,
			step: 10,
		});

		this.uiBuilder.addSlider(container, {
			key: "graphZoomPreviewFrontmatterHeight",
			name: "Zoom preview frontmatter height",
			desc: "Maximum height in pixels for the frontmatter section in zoom preview",
			min: 50,
			max: 300,
			step: 5,
		});

		this.uiBuilder.addSlider(container, {
			key: "graphAnimationDuration",
			name: "Graph animation duration",
			desc: "Duration of graph layout animations in milliseconds. Set to 0 for instant layout.",
			min: 0,
			max: 2000,
			step: 50,
		});

		this.uiBuilder.addSlider(container, {
			key: "allRelatedMaxDepth",
			name: "All Related recursion depth",
			desc: "Maximum number of constellation levels to traverse when 'All Related' is enabled (1-20). Higher values show more distant relationships but may impact performance.",
			min: 1,
			max: 20,
			step: 1,
		});

		this.uiBuilder.addSlider(container, {
			key: "hierarchyMaxDepth",
			name: "Hierarchy traversal depth",
			desc: "Maximum number of levels to traverse in hierarchy mode (1-50). Controls how deep the parent-child tree will be displayed.",
			min: 1,
			max: 50,
			step: 1,
		});

		this.uiBuilder.addTextArray(container, {
			key: "displayNodeProperties",
			name: "Display properties in nodes",
			desc: "Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)",
			placeholder: "e.g., status, priority",
		});

		this.uiBuilder.addToggle(container, {
			key: "showGraphTooltips",
			name: "Show node tooltips",
			desc: "Display property tooltips when hovering over nodes in the graph. Can also be toggled with a hotkey.",
		});

		this.uiBuilder.addSlider(container, {
			key: "graphTooltipWidth",
			name: "Tooltip width",
			desc: "Maximum width of node tooltips in pixels (150-500px)",
			min: 150,
			max: 500,
			step: 5,
		});
	}
}
