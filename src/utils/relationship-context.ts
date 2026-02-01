import { getFileContext, parsePropertyLinks } from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";
import type { FileRelationships } from "../core/indexer";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { Frontmatter, NexusPropertiesSettings } from "../types/settings";

interface RelationshipContext {
	propName: string;
	reversePropName: string;
	paths: string[];
}

export interface InverseRelationship {
	targetFilePath: string;
	propertyName: string;
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

/**
 * Captures inverse relationships from frontmatter.
 * For each relationship type, finds which files need this file added back to their inverse property.
 * Used for undo operations where bidirectional links need to be restored.
 */
export function captureInverseRelationships(
	app: App,
	filePath: string,
	frontmatter: Frontmatter,
	settings: NexusPropertiesSettings
): InverseRelationship[] {
	const relationships: InverseRelationship[] = [];

	for (const config of RELATIONSHIP_CONFIGS) {
		const propName = config.getProp(settings);
		const reversePropName = config.getReverseProp(settings);
		const links = parsePropertyLinks(frontmatter[propName] as string | string[] | undefined);

		for (const link of links) {
			const targetContext = getFileContext(app, link, { sourcePath: filePath });
			if (targetContext.file) {
				relationships.push({
					targetFilePath: targetContext.pathWithExt,
					propertyName: reversePropName,
				});
			}
		}
	}

	return relationships;
}
