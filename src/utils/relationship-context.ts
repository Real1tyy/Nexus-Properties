import type { FileRelationships } from "../core/indexer";
import type { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { parsePropertyLinks } from "./link-parser";

export interface RelationshipContext {
	propName: string;
	allPropName: string;
	reversePropName: string;
	reverseAllPropName: string;
	paths: string[];
	allPaths: string[];
}

export interface RelationshipDiff {
	oldPaths: string[];
	newPaths: string[];
	oldSet: Set<string>;
	newSet: Set<string>;
	addedLinks: string[];
	removedLinks: string[];
}

/**
 * Creates a relationship context containing property names and paths for a given relationship configuration.
 * This includes both direct and transitive (all_*) relationship properties.
 */
export function getRelationshipContext(
	config: (typeof RELATIONSHIP_CONFIGS)[number],
	relationships: FileRelationships,
	settings: NexusPropertiesSettings
): RelationshipContext {
	return {
		propName: config.getProp(settings),
		allPropName: config.getAllProp(settings),
		reversePropName: config.getReverseProp(settings),
		reverseAllPropName: config.getReverseAllProp(settings),
		paths: parsePropertyLinks(relationships[config.type]),
		allPaths: parsePropertyLinks(relationships[config.allKey]),
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
