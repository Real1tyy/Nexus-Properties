import { z } from "zod";
import { SETTINGS_DEFAULTS, SETTINGS_VERSION } from "./constants";

export type Frontmatter = Record<string, unknown>;

export const NexusPropertiesSettingsSchema = z.object({
	version: z.number().int().positive().default(SETTINGS_VERSION),

	// Property names for direct relationships
	parentProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_PARENT_PROP),
	childrenProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_CHILDREN_PROP),
	relatedProp: z.string().default(SETTINGS_DEFAULTS.DEFAULT_RELATED_PROP),

	// Directories to scan - ["*"] means scan all, otherwise only scan specified directories and subdirectories
	directories: z.array(z.string()).default([...SETTINGS_DEFAULTS.DEFAULT_DIRECTORIES]),

	// Relationship settings
	autoLinkSiblings: z.boolean().default(SETTINGS_DEFAULTS.DEFAULT_AUTO_LINK_SIBLINGS),

	// UI settings
	showRibbonIcon: z.boolean().default(true),
});

export type NexusPropertiesSettings = z.infer<typeof NexusPropertiesSettingsSchema>;
