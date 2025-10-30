import { z } from "zod";
import { SETTINGS_DEFAULTS, SETTINGS_VERSION } from "./constants";

export type Frontmatter = Record<string, unknown>;

export const ColorRuleSchema = z.object({
	id: z.string(),
	expression: z.string(),
	color: z.string(),
	enabled: z.boolean(),
});

export type ColorRule = z.infer<typeof ColorRuleSchema>;

export const FilterPresetSchema = z.object({
	name: z.string(),
	expression: z.string(),
});

export type FilterPreset = z.infer<typeof FilterPresetSchema>;

export const PathExcludedPropertiesSchema = z.object({
	id: z.string(),
	path: z.string(),
	excludedProperties: z.array(z.string()),
	enabled: z.boolean(),
});

export type PathExcludedProperties = z.infer<typeof PathExcludedPropertiesSchema>;

export const PathIncludedPropertiesSchema = z.object({
	id: z.string(),
	path: z.string(),
	includedProperties: z.array(z.string()),
	enabled: z.boolean(),
});

export type PathIncludedProperties = z.infer<typeof PathIncludedPropertiesSchema>;

export const NexusPropertiesSettingsSchema = z.object({
	version: z.number().int().positive().optional().default(SETTINGS_VERSION),

	// Property names for direct relationships
	parentProp: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_PARENT_PROP),
	childrenProp: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_CHILDREN_PROP),
	relatedProp: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_RELATED_PROP),

	// Directories to scan - ["*"] means scan all, otherwise only scan specified directories and subdirectories
	directories: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_DIRECTORIES]),

	// Relationship settings
	autoLinkSiblings: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_AUTO_LINK_SIBLINGS),

	// Node creation settings
	zettelIdProp: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_ZETTEL_ID_PROP),

	// UI settings
	showRibbonIcon: z.boolean().optional().default(true),

	// Preview settings
	hideEmptyProperties: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_HIDE_EMPTY_PROPERTIES),
	hideUnderscoreProperties: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_HIDE_UNDERSCORE_PROPERTIES),

	// Graph settings
	graphEnlargedWidthPercent: z
		.number()
		.min(50)
		.max(100)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT),
	graphZoomPreviewHeight: z
		.number()
		.min(120)
		.max(700)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT),
	graphZoomPreviewFrontmatterHeight: z
		.number()
		.min(50)
		.max(300)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT),
	graphAnimationDuration: z
		.number()
		.min(0)
		.max(2000)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ANIMATION_DURATION),
	allRelatedMaxDepth: z
		.number()
		.int()
		.min(1)
		.max(20)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ALL_RELATED_MAX_DEPTH),
	hierarchyMaxDepth: z.number().int().min(1).max(50).optional().default(SETTINGS_DEFAULTS.DEFAULT_HIERARCHY_MAX_DEPTH),

	// Zoom preview behavior
	zoomHideFrontmatterByDefault: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_FRONTMATTER),
	zoomHideContentByDefault: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_CONTENT),

	// Tooltip settings
	showGraphTooltips: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_GRAPH_TOOLTIPS),
	graphTooltipWidth: z.number().min(150).max(500).optional().default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_TOOLTIP_WIDTH),

	// Graph UI settings
	showSearchBar: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_SEARCH_BAR),
	showFilterBar: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_FILTER_BAR),
	showViewSwitcherHeader: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_VIEW_SWITCHER_HEADER),

	// Graph filtering settings
	filterExpressions: z.array(z.string()).optional().default([]),
	filterPresets: z.array(FilterPresetSchema).optional().default([]),
	displayNodeProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_DISPLAY_NODE_PROPERTIES]),

	// Node color rules
	defaultNodeColor: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR),
	colorRules: z.array(ColorRuleSchema).optional().default([]),

	// Excluded properties for node creation
	defaultExcludedProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_EXCLUDED_PROPERTIES]),
	pathExcludedProperties: z.array(PathExcludedPropertiesSchema).optional().default([]),

	// Included properties for bases view columns
	defaultBasesIncludedProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_BASES_INCLUDED_PROPERTIES]),
	pathBasesIncludedProperties: z.array(PathIncludedPropertiesSchema).optional().default([]),

	// Archived filtering for bases view
	excludeArchived: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_EXCLUDE_ARCHIVED),
	archivedProp: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_ARCHIVED_PROP),
});

export type NexusPropertiesSettings = z.infer<typeof NexusPropertiesSettingsSchema>;
