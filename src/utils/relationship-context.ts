import { parsePropertyLinks } from "@real1ty-obsidian-plugins";
import type { FileRelationships } from "../core/indexer";
import type { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";

interface RelationshipContext {
	propName: string;
	reversePropName: string;
	paths: string[];
}

interface RelationshipDiff {
	oldPaths: string[];
	newPaths: string[];
	oldSet: Set<string>;
	newSet: Set<string>;
	addedLinks: string[];
	removedLinks: string[];
}

/**
 * Creates a relationship context containing property names and paths for a given relationship configuration.
 */
export function getRelationshipContext(
	config: (typeof RELATIONSHIP_CONFIGS)[number],
	relationships: FileRelationships,
	settings: NexusPropertiesSettings
): RelationshipContext {
	return {
		propName: config.getProp(settings),
		reversePropName: config.getReverseProp(settings),
		paths: parsePropertyLinks(relationships[config.type]),
	};
}

/**
 * Computes the differences between old and new relationships, including added and removed links.
 * Returns a combined object with both relationship context and diff information.
 */
export function getRelationshipDiff(
	config: (typeof RELATIONSHIP_CONFIGS)[number],
	oldRelationships: FileRelationships,
	newRelationships: FileRelationships,
	settings: NexusPropertiesSettings
): RelationshipDiff & RelationshipContext {
	const oldPaths = parsePropertyLinks(oldRelationships[config.type]);
	const newPaths = parsePropertyLinks(newRelationships[config.type]);
	const oldSet = new Set(oldPaths);
	const newSet = new Set(newPaths);

	return {
		...getRelationshipContext(config, newRelationships, settings),
		oldPaths,
		newPaths,
		oldSet,
		newSet,
		addedLinks: [...newSet].filter((link) => !oldSet.has(link)),
		removedLinks: [...oldSet].filter((link) => !newSet.has(link)),
	};
}
