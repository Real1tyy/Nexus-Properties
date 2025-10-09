import type { NexusPropertiesSettings } from "./settings";

export const PLUGIN_ID = "nexus-properties";

export const SETTINGS_VERSION = 1;

export const SETTINGS_DEFAULTS = {
	DEFAULT_PARENT_PROP: "Parent",
	DEFAULT_CHILDREN_PROP: "Child",
	DEFAULT_RELATED_PROP: "Related",

	DEFAULT_ALL_PARENTS_PROP: "_AllParents",
	DEFAULT_ALL_CHILDREN_PROP: "_AllChildren",
	DEFAULT_ALL_RELATED_PROP: "_AllRelated",

	DEFAULT_DIRECTORIES: ["*"],
} as const;

export const SCAN_CONCURRENCY = 10;

export type RelationshipType = "parent" | "children" | "related";

export interface RelationshipConfig {
	type: RelationshipType;
	getProp: (settings: NexusPropertiesSettings) => string;
	getAllProp: (settings: NexusPropertiesSettings) => string;
	getReverseProp: (settings: NexusPropertiesSettings) => string;
}

export const RELATIONSHIP_CONFIGS: RelationshipConfig[] = [
	{
		type: "parent",
		getProp: (s) => s.parentProp,
		getAllProp: (s) => s.allParentsProp,
		getReverseProp: (s) => s.childrenProp,
	},
	{
		type: "children",
		getProp: (s) => s.childrenProp,
		getAllProp: (s) => s.allChildrenProp,
		getReverseProp: (s) => s.parentProp,
	},
	{
		type: "related",
		getProp: (s) => s.relatedProp,
		getAllProp: (s) => s.allRelatedProp,
		getReverseProp: (s) => s.relatedProp,
	},
];
