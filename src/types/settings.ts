import { z } from "zod";

export const NexusPropertiesSettingsSchema = z.object({
	version: z.number().int().positive().default(1),

	// Property names for direct relationships
	parentProp: z.string().default("parent"),
	childrenProp: z.string().default("children"),
	relatedProp: z.string().default("related"),

	// Property names for computed recursive relationships
	allParentsProp: z.string().default("allParents"),
	allChildrenProp: z.string().default("allChildren"),
	allRelatedProp: z.string().default("allRelated"),
});

export type NexusPropertiesSettings = z.infer<typeof NexusPropertiesSettingsSchema>;
