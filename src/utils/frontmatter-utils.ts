import type { NexusPropertiesSettings } from "../types/settings";

/**
 * Returns the set of property names that are internally managed by Nexus Properties.
 * These include relationship properties, the zettel ID, prioritize parent, and the title property.
 * Should never be propagated to children or treated as user-editable data during propagation.
 */
export function getInternalNexusProperties(settings: NexusPropertiesSettings): Set<string> {
	return new Set(
		[
			settings.parentProp,
			settings.childrenProp,
			settings.relatedProp,
			settings.zettelIdProp,
			settings.prioritizeParentProp,
			settings.titleProp,
		].filter((prop) => prop.length > 0)
	);
}

/**
 * Parse excluded properties for frontmatter propagation.
 * Returns a set of property names that should never be propagated to children.
 * Includes all internal Nexus properties plus any user-configured exclusions.
 */
export function parseExcludedProps(settings: NexusPropertiesSettings): Set<string> {
	const excludedPropsStr = settings.excludedPropagatedProps || "";
	const userExcluded = excludedPropsStr
		.split(",")
		.map((prop) => prop.trim())
		.filter((prop) => prop.length > 0);

	const internalProps = getInternalNexusProperties(settings);

	return new Set([...internalProps, ...userExcluded]);
}
