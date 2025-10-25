import type { NexusPropertiesSettings } from "./settings";

export const PLUGIN_ID = "nexus-properties";

export const SETTINGS_VERSION = 1;

export const SETTINGS_DEFAULTS = {
	DEFAULT_PARENT_PROP: "Parent",
	DEFAULT_CHILDREN_PROP: "Child",
	DEFAULT_RELATED_PROP: "Related",

	DEFAULT_DIRECTORIES: ["*"],
	DEFAULT_AUTO_LINK_SIBLINGS: true,
	DEFAULT_HIDE_EMPTY_PROPERTIES: true,
	DEFAULT_HIDE_UNDERSCORE_PROPERTIES: true,

	DEFAULT_ZETTEL_ID_PROP: "_ZettelID",

	DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT: 75,
	DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT: 280,
	DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT: 90,
	DEFAULT_DISPLAY_NODE_PROPERTIES: [],
	DEFAULT_GRAPH_ANIMATION_DURATION: 800,
	DEFAULT_SHOW_GRAPH_TOOLTIPS: true,
	DEFAULT_GRAPH_TOOLTIP_WIDTH: 255,
	DEFAULT_ALL_RELATED_MAX_DEPTH: 10,
	DEFAULT_HIERARCHY_MAX_DEPTH: 10,

	// Zoom preview defaults
	DEFAULT_ZOOM_HIDE_FRONTMATTER: false,
	DEFAULT_ZOOM_HIDE_CONTENT: false,

	// Graph UI defaults
	DEFAULT_SHOW_SEARCH_BAR: true,
	DEFAULT_SHOW_FILTER_BAR: true,

	// Node color defaults
	DEFAULT_NODE_COLOR: "#e9f2ff",

	// Node creation defaults
	DEFAULT_EXCLUDED_PROPERTIES: ["Parent", "Child", "Related", "_ZettelID"],
} as const;

export const SCAN_CONCURRENCY = 10;

export type RelationshipType = "parent" | "children" | "related";

export interface RelationshipConfig {
	type: RelationshipType;
	getProp: (settings: NexusPropertiesSettings) => string;
	getReverseProp: (settings: NexusPropertiesSettings) => string;
}

export const RELATIONSHIP_CONFIGS: RelationshipConfig[] = [
	{
		type: "parent",
		getProp: (s) => s.parentProp,
		getReverseProp: (s) => s.childrenProp,
	},
	{
		type: "children",
		getProp: (s) => s.childrenProp,
		getReverseProp: (s) => s.parentProp,
	},
	{
		type: "related",
		getProp: (s) => s.relatedProp,
		getReverseProp: (s) => s.relatedProp,
	},
];
