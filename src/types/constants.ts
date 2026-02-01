import type { NexusPropertiesSettings } from "./settings";

const _PLUGIN_ID = "nexus-properties";

export const SETTINGS_DEFAULTS = {
	DEFAULT_VERSION: "1.0.0",
	DEFAULT_PARENT_PROP: "Parent",
	DEFAULT_CHILDREN_PROP: "Child",
	DEFAULT_RELATED_PROP: "Related",
	DEFAULT_PRIORITIZE_PARENT_PROP: "",

	DEFAULT_DIRECTORIES: ["*"],
	DEFAULT_AUTO_LINK_SIBLINGS: true,
	DEFAULT_VIEW_LEAF_POSITION: "left" as "left" | "right",
	DEFAULT_HIDE_EMPTY_PROPERTIES: true,
	DEFAULT_HIDE_UNDERSCORE_PROPERTIES: true,

	DEFAULT_ZETTEL_ID_PROP: "_ZettelID",
	DEFAULT_TITLE_PROP: "Title",
	DEFAULT_EXCLUDE_TITLE_DIRECTORIES: "",
	DEFAULT_TITLE_PROPERTY_MODE: "unknown" as "unknown" | "enabled" | "disabled",

	DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT: 75,
	DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT: 280,
	DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT: 90,
	DEFAULT_MOBILE_FRONTMATTER_PROPERTY_WIDTH: 100,
	DEFAULT_DISPLAY_NODE_PROPERTIES: [],
	DEFAULT_GRAPH_ANIMATION_DURATION: 800,
	DEFAULT_SHOW_GRAPH_TOOLTIPS: true,
	DEFAULT_GRAPH_TOOLTIP_WIDTH: 255,
	DEFAULT_ALL_RELATED_MAX_DEPTH: 10,
	DEFAULT_HIERARCHY_MAX_DEPTH: 10,

	// Multi-row layout defaults
	DEFAULT_USE_MULTI_ROW_LAYOUT: false,
	DEFAULT_MAX_CHILDREN_PER_ROW: 10,

	// Zoom preview defaults
	DEFAULT_ZOOM_HIDE_FRONTMATTER: false,
	DEFAULT_ZOOM_HIDE_CONTENT: false,

	// Graph UI defaults
	DEFAULT_SHOW_SEARCH_BAR: true,
	DEFAULT_SHOW_FILTER_BAR: true,
	DEFAULT_SHOW_VIEW_SWITCHER_HEADER: true,
	DEFAULT_SHOW_SIMPLE_STATISTICS: true,
	DEFAULT_SHOW_RECURSIVE_STATISTICS: true,
	DEFAULT_SHOW_ZOOM_INDICATOR: true,
	DEFAULT_SHOW_DEPTH_SLIDER: true,
	DEFAULT_MAINTAIN_INDIRECT_CONNECTIONS: true,

	// Node color defaults
	DEFAULT_NODE_COLOR: "#e9f2ff",

	// Node creation defaults
	DEFAULT_EXCLUDED_PROPERTIES: ["Parent", "Child", "Related", "_ZettelID"],

	// Bases view defaults
	DEFAULT_BASES_INCLUDED_PROPERTIES: [],
	DEFAULT_EXCLUDE_ARCHIVED: false,
	DEFAULT_ARCHIVED_PROP: "Archived",
	DEFAULT_BASES_CUSTOM_FORMULAS: "",
	DEFAULT_BASES_CUSTOM_SORT: "",
	DEFAULT_SHOW_ALL_RELATIONSHIP_VIEWS: false,
	DEFAULT_BASES_VIEW_TYPE: "cards" as "table" | "cards" | "list",

	// MOC view defaults
	DEFAULT_MOC_DISPLAY_PROPERTIES: [] as string[],

	// Frontmatter propagation defaults
	PROPAGATE_FRONTMATTER_TO_CHILDREN: false,
	ASK_BEFORE_PROPAGATING_FRONTMATTER: false,
	DEFAULT_EXCLUDED_PROPAGATED_PROPS: "",
	DEFAULT_PROPAGATION_DEBOUNCE_MS: 1000,
} as const;

export const SCAN_CONCURRENCY = 10;

export type RelationshipType = "parent" | "children" | "related";
export type NodeCreationType = "parent" | "child" | "related";

interface RelationshipConfig {
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
