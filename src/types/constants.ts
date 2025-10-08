export const PLUGIN_ID = "nexus-properties";

export const SETTINGS_VERSION = 1;

export const SETTINGS_DEFAULTS = {
	DEFAULT_PARENT_PROP: "parent",
	DEFAULT_CHILDREN_PROP: "children",
	DEFAULT_RELATED_PROP: "related",

	DEFAULT_ALL_PARENTS_PROP: "allParents",
	DEFAULT_ALL_CHILDREN_PROP: "allChildren",
	DEFAULT_ALL_RELATED_PROP: "allRelated",
} as const;
