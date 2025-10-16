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

	DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT: 75,
	DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT: 280,
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
