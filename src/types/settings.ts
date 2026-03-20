import type { SettingsStore } from "@real1ty-obsidian-plugins";
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

		parentProp: z
			.string()
			.describe("Property name for parent reference (bidirectional with children)")
			.catch(SETTINGS_DEFAULTS.DEFAULT_PARENT_PROP),
		childrenProp: z
			.string()
			.describe("Property name for children references (bidirectional with parent)")
			.catch(SETTINGS_DEFAULTS.DEFAULT_CHILDREN_PROP),
		relatedProp: z
			.string()
			.describe("Property name for related files (bidirectional - automatically syncs between linked files)")
			.catch(SETTINGS_DEFAULTS.DEFAULT_RELATED_PROP),
		prioritizeParentProp: z
			.string()
			.describe(
				"Optional property name to specify which parent should be prioritized when building hierarchy graphs. If a node has multiple parents and this property is set with a parent's name, that parent will be chosen."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_PRIORITIZE_PARENT_PROP),

		directories: z.array(z.string()).catch([...SETTINGS_DEFAULTS.DEFAULT_DIRECTORIES]),

		autoLinkSiblings: z
			.boolean()
			.describe(
				"Automatically mark nodes as related when they share the same parent (siblings are related to each other)"
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_AUTO_LINK_SIBLINGS),

		zettelIdProp: z
			.string()
			.describe("Property name for unique timestamp identifier assigned to new nodes")
			.catch(SETTINGS_DEFAULTS.DEFAULT_ZETTEL_ID_PROP),
		titleProp: z
			.string()
			.describe("Property name for auto-assigned title (file name with parent prefix stripped)")
			.catch(SETTINGS_DEFAULTS.DEFAULT_TITLE_PROP),
		excludeTitleDirectories: z
			.string()
			.describe(
				"Comma-separated directory paths to exclude from automatic title property assignment (e.g., Templates, Daily Notes)"
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_EXCLUDE_TITLE_DIRECTORIES),
		titlePropertyMode: z
			.enum(["unknown", "enabled", "disabled"])
			.describe(
				"Enable to automatically add title properties to files. Disable to use raw file names in Bases view. Graph view always strips prefixes regardless of this setting."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_TITLE_PROPERTY_MODE),

		showRibbonIcon: z
			.boolean()
			.describe("Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.")
			.catch(true),
		viewLeafPosition: z
			.enum(["left", "right"])
			.describe("Choose which sidebar (left or right) to open the Nexus Properties view in.")
			.catch(SETTINGS_DEFAULTS.DEFAULT_VIEW_LEAF_POSITION),

		hideEmptyProperties: z
			.boolean()
			.describe("Hide properties with empty, null, or undefined values in tooltips and previews")
			.catch(SETTINGS_DEFAULTS.DEFAULT_HIDE_EMPTY_PROPERTIES),
		hideUnderscoreProperties: z
			.boolean()
			.describe("Hide properties that start with an underscore (_) in tooltips and previews")
			.catch(SETTINGS_DEFAULTS.DEFAULT_HIDE_UNDERSCORE_PROPERTIES),

		graphEnlargedWidthPercent: z
			.number()
			.min(50)
			.max(100)
			.describe("Percentage of window width when graph is enlarged")
			.catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT),
		graphZoomPreviewHeight: z
			.number()
			.min(120)
			.max(700)
			.describe("Maximum height in pixels for the zoom preview panel")
			.catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT),
		graphZoomPreviewFrontmatterHeight: z
			.number()
			.min(50)
			.max(300)
			.describe("Maximum height in pixels for the frontmatter section in zoom preview")
			.catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT),
		mobileFrontmatterPropertyWidth: z
			.number()
			.min(50)
			.max(300)
			.describe(
				"Minimum width in pixels for frontmatter properties in zoom preview on mobile (screens < 600px). Lower values fit more properties per row."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_MOBILE_FRONTMATTER_PROPERTY_WIDTH),
		graphAnimationDuration: z
			.number()
			.min(0)
			.max(2000)
			.describe("Duration of graph layout animations in milliseconds. Set to 0 for instant layout.")
			.catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ANIMATION_DURATION),
		allRelatedMaxDepth: z
			.number()
			.int()
			.min(1)
			.max(20)
			.describe(
				"Maximum number of constellation levels to traverse when 'All Related' is enabled (1-20). Higher values show more distant relationships but may impact performance."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_ALL_RELATED_MAX_DEPTH),
		hierarchyMaxDepth: z
			.number()
			.int()
			.min(1)
			.max(50)
			.describe(
				"Maximum number of levels to traverse in hierarchy mode (1-50). Controls how deep the parent-child tree will be displayed."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_HIERARCHY_MAX_DEPTH),

		useMultiRowLayout: z
			.boolean()
			.describe(
				"When a parent has many children, distribute them across multiple staggered rows to use more vertical space. This makes large hierarchies more readable by reducing horizontal spread."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_USE_MULTI_ROW_LAYOUT),
		maxChildrenPerRow: z
			.number()
			.int()
			.min(3)
			.max(30)
			.describe(
				"Maximum number of children to display in a single row before wrapping to the next row in staggered pattern (3-30). Only applies when multi-row layout is enabled."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_MAX_CHILDREN_PER_ROW),

		zoomHideFrontmatterByDefault: z
			.boolean()
			.describe("When entering zoom preview, frontmatter starts hidden by default")
			.catch(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_FRONTMATTER),
		zoomHideContentByDefault: z
			.boolean()
			.describe("When entering zoom preview, file content starts hidden by default")
			.catch(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_CONTENT),

		showGraphTooltips: z
			.boolean()
			.describe("Display property tooltips when hovering over nodes in the graph. Can also be toggled with a hotkey.")
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_GRAPH_TOOLTIPS),
		graphTooltipWidth: z
			.number()
			.min(150)
			.max(500)
			.describe("Maximum width of node tooltips in pixels (150-500px)")
			.catch(SETTINGS_DEFAULTS.DEFAULT_GRAPH_TOOLTIP_WIDTH),

		showSearchBar: z
			.boolean()
			.describe("Display the search bar in the graph view when it loads. You can still toggle it with the command.")
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_SEARCH_BAR),
		showFilterBar: z
			.boolean()
			.describe(
				"Display the filter bar (preset selector and expression input) in the graph view when it loads. You can still toggle it with commands."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_FILTER_BAR),
		showViewSwitcherHeader: z
			.boolean()
			.describe("Display the header with toggle button in the Nexus Properties view. Changes apply immediately.")
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_VIEW_SWITCHER_HEADER),
		showSimpleStatistics: z
			.boolean()
			.describe("Display direct parent, children, and related counts in the view switcher header.")
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_SIMPLE_STATISTICS),
		showRecursiveStatistics: z
			.boolean()
			.describe("Display recursive (all) parent, children, and related counts in the view switcher header.")
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_RECURSIVE_STATISTICS),
		showZoomIndicator: z
			.boolean()
			.describe(
				"Display the zoom level indicator in the filter row. Shows current zoom percentage and allows typing a specific zoom level."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_ZOOM_INDICATOR),
		showDepthSlider: z
			.boolean()
			.describe(
				"Display a slider in the graph view header to temporarily adjust the recursion depth for statistics and hierarchy rendering. Depth controls how many levels up/down to traverse from the current node."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_DEPTH_SLIDER),
		maintainIndirectConnections: z
			.boolean()
			.describe(
				"When search or filter removes intermediate nodes, still show connections between nodes that were indirectly connected through them. For example, if A → B → C and B is filtered out, still show A → C."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_MAINTAIN_INDIRECT_CONNECTIONS),

		filterExpressions: z
			.array(z.string())
			.describe(
				"One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only nodes matching all expressions are shown in the graph."
			)
			.catch([]),
		filterPresets: z.array(FilterPresetSchema).catch([]),
		preFillFilterPreset: z.string().catch(""),
		displayNodeProperties: z
			.array(z.string())
			.describe("Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)")
			.catch([...SETTINGS_DEFAULTS.DEFAULT_DISPLAY_NODE_PROPERTIES]),

		defaultNodeColor: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR),
		colorRules: z.array(ColorRuleSchema).catch([]),

		defaultExcludedProperties: z
			.array(z.string())
			.describe(
				"Comma-separated list of frontmatter properties to ALWAYS exclude from copying when creating new nodes. These are excluded regardless of any rules below."
			)
			.catch([...SETTINGS_DEFAULTS.DEFAULT_EXCLUDED_PROPERTIES]),
		pathExcludedProperties: z.array(PathExcludedPropertiesSchema).catch([]),

		defaultBasesIncludedProperties: z
			.array(z.string())
			.describe(
				"Comma-separated list of frontmatter properties to include as columns in Bases view tables. 'file.name' is always included first. These properties apply to all files unless overridden by path-based rules below."
			)
			.catch([...SETTINGS_DEFAULTS.DEFAULT_BASES_INCLUDED_PROPERTIES]),
		pathBasesIncludedProperties: z.array(PathIncludedPropertiesSchema).catch([]),

		excludeArchived: z
			.boolean()
			.describe(
				"When enabled, shows separate archived and non-archived views. When disabled, shows all items without filtering."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_EXCLUDE_ARCHIVED),
		archivedProp: z
			.string()
			.describe("Name of the frontmatter property used to mark files as archived (e.g., 'Archived', '_Archived').")
			.catch(SETTINGS_DEFAULTS.DEFAULT_ARCHIVED_PROP),

		basesCustomFormulas: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_FORMULAS),
		basesCustomSort: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_SORT),

		showAllRelationshipViews: z
			.boolean()
			.describe(
				"Add 'All Children', 'All Parents', and 'All Related' options to the Bases view dropdown. These show all nodes recursively traversed from the current file."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_ALL_RELATIONSHIP_VIEWS),

		basesViewType: z
			.enum(["table", "cards", "list"])
			.describe(
				"Choose the default view type for Bases views. Cards shows visual cards, Table displays data in rows and columns, and List shows a simple list."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_BASES_VIEW_TYPE),

		hierarchySource: z
			.enum(["properties", "moc-content"])
			.describe(
				"The default mode when both Properties and MOC content are available. 'Properties' uses frontmatter relationships. 'MOC Content' uses bullet list hierarchies from note content."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_HIERARCHY_SOURCE),
		enableMocContentReading: z
			.boolean()
			.describe(
				"When enabled, reads note content to detect MOC (Map of Content) bullet list hierarchies. If valid MOC content is found (3+ links with nested structure), a button appears to switch between Properties and MOC modes. Disable for better performance if you don't use MOC bullet lists."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_ENABLE_MOC_CONTENT_READING),

		mocDisplayProperties: z
			.array(z.string())
			.describe(
				"Comma-separated list of frontmatter properties to show next to each note in the MOC tree. Properties with wiki links will be rendered as clickable links."
			)
			.catch([...SETTINGS_DEFAULTS.DEFAULT_MOC_DISPLAY_PROPERTIES]),

		propagateRenameToChildren: z
			.boolean()
			.describe(
				"When a parent file is renamed, automatically rename children whose filenames start with the old parent name to use the new parent name. For example, renaming 'Project' to 'Initiative' will rename 'Project - Task 1' to 'Initiative - Task 1'."
			)
			.catch(SETTINGS_DEFAULTS.PROPAGATE_RENAME_TO_CHILDREN),

		propagateFrontmatterToChildren: z
			.boolean()
			.describe(
				"Automatically propagate frontmatter changes from parent files to all child files recursively. When you update custom properties (like status, priority, tags) in a parent file, all descendants are updated immediately."
			)
			.catch(SETTINGS_DEFAULTS.PROPAGATE_FRONTMATTER_TO_CHILDREN),
		askBeforePropagatingFrontmatter: z
			.boolean()
			.describe(
				"Show a confirmation modal before propagating frontmatter changes to children. Allows you to review changes before applying them to all descendant files."
			)
			.catch(SETTINGS_DEFAULTS.ASK_BEFORE_PROPAGATING_FRONTMATTER),
		excludedPropagatedProps: z
			.string()
			.describe(
				"Comma-separated list of frontmatter property names to exclude from propagation. These properties will not be copied to child files. Relationship properties (Parent, Child, Related, _ZettelID) and Prioritize Parent are always excluded automatically."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_EXCLUDED_PROPAGATED_PROPS),
		propagationDebounceMs: z
			.number()
			.int()
			.min(100)
			.max(10000)
			.describe(
				"Delay in milliseconds before propagating frontmatter changes to children. Multiple rapid changes within this window will be accumulated and applied together."
			)
			.catch(SETTINGS_DEFAULTS.DEFAULT_PROPAGATION_DEBOUNCE_MS),
	})
	.strip();

export type NexusPropertiesSettings = z.infer<typeof NexusPropertiesSettingsSchema>;

export type NexusPropertiesSettingsStore = SettingsStore<typeof NexusPropertiesSettingsSchema>;
