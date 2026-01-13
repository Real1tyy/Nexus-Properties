import { z } from "zod";
import { SETTINGS_DEFAULTS } from "./constants";

export type Frontmatter = Record<string, unknown>;

const ColorRuleSchema = z
	.object({
		id: z.string(),
		expression: z.string(),
		color: z.string(),
		enabled: z.boolean(),
	})
	.strip();

const FilterPresetSchema = z
	.object({
		name: z.string(),
		expression: z.string(),
	})
	.strip();

export type FilterPreset = z.infer<typeof FilterPresetSchema>;

const PathExcludedPropertiesSchema = z
	.object({
		id: z.string(),
		path: z.string(),
		excludedProperties: z.array(z.string()),
		enabled: z.boolean(),
	})
	.strip();

const PathIncludedPropertiesSchema = z
	.object({
		id: z.string(),
		path: z.string(),
		includedProperties: z.array(z.string()),
		enabled: z.boolean(),
	})
	.strip();

export const NexusPropertiesSettingsSchema = z
	.object({
		version: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_VERSION),

		// Property names for direct relationships
		parentProp: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_PARENT_PROP),
		childrenProp: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_CHILDREN_PROP),
		relatedProp: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_RELATED_PROP),
		prioritizeParentProp: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_PRIORITIZE_PARENT_PROP),

		// Directories to scan - ["*"] means scan all, otherwise only scan specified directories and subdirectories
		directories: z.array(z.string()).catch([...SETTINGS_DEFAULTS.DEFAULT_DIRECTORIES]),

		// Relationship settings
		autoLinkSiblings: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_AUTO_LINK_SIBLINGS),

		// Node creation settings
		zettelIdProp: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_ZETTEL_ID_PROP),

		// UI settings
		showRibbonIcon: z.boolean().catch(true),
		viewLeafPosition: z.enum(["left", "right"]).catch(SETTINGS_DEFAULTS.DEFAULT_VIEW_LEAF_POSITION),

		// Preview settings
		hideEmptyProperties: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_HIDE_EMPTY_PROPERTIES),
		hideUnderscoreProperties: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_HIDE_UNDERSCORE_PROPERTIES),

		// Graph settings
		graphEnlargedWidthPercent: z
			.number()
			.min(50)
			.max(100)
			.catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT),
		graphZoomPreviewHeight: z.number().min(120).max(700).catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT),
		graphZoomPreviewFrontmatterHeight: z
			.number()
			.min(50)
			.max(300)
			.catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT),
		mobileFrontmatterPropertyWidth: z
			.number()
			.min(50)
			.max(300)
			.catch(SETTINGS_DEFAULTS.DEFAULT_MOBILE_FRONTMATTER_PROPERTY_WIDTH),
		graphAnimationDuration: z.number().min(0).max(2000).catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ANIMATION_DURATION),
		allRelatedMaxDepth: z.number().int().min(1).max(20).catch(SETTINGS_DEFAULTS.DEFAULT_ALL_RELATED_MAX_DEPTH),
		hierarchyMaxDepth: z.number().int().min(1).max(50).catch(SETTINGS_DEFAULTS.DEFAULT_HIERARCHY_MAX_DEPTH),

		// Multi-row layout settings
		useMultiRowLayout: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_USE_MULTI_ROW_LAYOUT),
		maxChildrenPerRow: z.number().int().min(3).max(30).catch(SETTINGS_DEFAULTS.DEFAULT_MAX_CHILDREN_PER_ROW),

		// Zoom preview behavior
		zoomHideFrontmatterByDefault: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_FRONTMATTER),
		zoomHideContentByDefault: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_CONTENT),

		// Tooltip settings
		showGraphTooltips: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_GRAPH_TOOLTIPS),
		graphTooltipWidth: z.number().min(150).max(500).catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_TOOLTIP_WIDTH),

		// Graph UI settings
		showSearchBar: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_SEARCH_BAR),
		showFilterBar: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_FILTER_BAR),
		showViewSwitcherHeader: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_VIEW_SWITCHER_HEADER),
		showSimpleStatistics: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_SIMPLE_STATISTICS),
		showRecursiveStatistics: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_RECURSIVE_STATISTICS),
		showZoomIndicator: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_ZOOM_INDICATOR),
		showDepthSlider: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_DEPTH_SLIDER),
		maintainIndirectConnections: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_MAINTAIN_INDIRECT_CONNECTIONS),

		// Graph filtering settings
		filterExpressions: z.array(z.string()).catch([]),
		filterPresets: z.array(FilterPresetSchema).catch([]),
		preFillFilterPreset: z.string().catch(""),
		displayNodeProperties: z.array(z.string()).catch([...SETTINGS_DEFAULTS.DEFAULT_DISPLAY_NODE_PROPERTIES]),

		// Node color rules
		defaultNodeColor: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR),
		colorRules: z.array(ColorRuleSchema).catch([]),

		// Excluded properties for node creation
		defaultExcludedProperties: z.array(z.string()).catch([...SETTINGS_DEFAULTS.DEFAULT_EXCLUDED_PROPERTIES]),
		pathExcludedProperties: z.array(PathExcludedPropertiesSchema).catch([]),

		// Included properties for bases view columns
		defaultBasesIncludedProperties: z.array(z.string()).catch([...SETTINGS_DEFAULTS.DEFAULT_BASES_INCLUDED_PROPERTIES]),
		pathBasesIncludedProperties: z.array(PathIncludedPropertiesSchema).catch([]),

		// Archived filtering for bases view
		excludeArchived: z.boolean().catch(SETTINGS_DEFAULTS.DEFAULT_EXCLUDE_ARCHIVED),
		archivedProp: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_ARCHIVED_PROP),

		// Custom sorting for bases view
		basesCustomFormulas: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_FORMULAS),
		basesCustomSort: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_SORT),

		// Frontmatter propagation settings
		propagateFrontmatterToChildren: z.boolean().catch(SETTINGS_DEFAULTS.PROPAGATE_FRONTMATTER_TO_CHILDREN),
		askBeforePropagatingFrontmatter: z.boolean().catch(SETTINGS_DEFAULTS.ASK_BEFORE_PROPAGATING_FRONTMATTER),
		excludedPropagatedProps: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_EXCLUDED_PROPAGATED_PROPS),
		propagationDebounceMs: z
			.number()
			.int()
			.min(100)
			.max(10000)
			.catch(SETTINGS_DEFAULTS.DEFAULT_PROPAGATION_DEBOUNCE_MS),
	})
	.strip();

export type NexusPropertiesSettings = z.infer<typeof NexusPropertiesSettingsSchema>;
