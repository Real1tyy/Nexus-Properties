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
