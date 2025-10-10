import { z } from "zod";
import { SETTINGS_DEFAULTS, SETTINGS_VERSION } from "./constants";

export type Frontmatter = Record<string, unknown>;

export const NexusPropertiesSettingsSchema = z.object({
	version: z.number().int().positive().default(SETTINGS_VERSION),

	// Property names for direct relationships
	parentProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_PARENT_PROP),
	childrenProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_CHILDREN_PROP),
	relatedProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_RELATED_PROP),

	// Property names for computed recursive relationships
	allParentsProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_ALL_PARENTS_PROP),
	allChildrenProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_ALL_CHILDREN_PROP),
	allRelatedProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_ALL_RELATED_PROP),

	// Directories to scan - ["*"] means scan all, otherwise only scan specified directories and subdirectories
	directories: z.array(z.string()).default([...SETTINGS_DEFAULTS.DEFAULT_DIRECTORIES]),

	// UI settings
	showRibbonIcon: z.boolean().default(true),
});

export type NexusPropertiesSettings = z.infer<typeof NexusPropertiesSettingsSchema>;
