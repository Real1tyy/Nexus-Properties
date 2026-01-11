import type { NexusPropertiesSettings } from "../types/settings";

/**
 * Parse excluded properties for frontmatter propagation.
 * Returns a set of property names that should never be propagated to children.
 */
export function parseExcludedProps(settings: NexusPropertiesSettings): Set<string> {
	const excludedPropsStr = settings.excludedPropagatedProps || "";
	const userExcluded = excludedPropsStr
		.split(",")
		.map((prop) => prop.trim())
		.filter((prop) => prop.length > 0);

	const alwaysExcluded = [
		settings.parentProp,
		settings.childrenProp,
		settings.relatedProp,
		settings.zettelIdProp,
		settings.prioritizeParentProp,
	];

	return new Set([...alwaysExcluded, ...userExcluded]);
}
