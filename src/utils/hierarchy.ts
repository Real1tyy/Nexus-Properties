import { extractFilePath, getFileContext, parsePropertyLinks } from "@real1ty-obsidian-plugins/utils";
import { type App, TFile } from "obsidian";
import type { FileRelationships, Indexer } from "../core/indexer";
import { RELATIONSHIP_CONFIGS, type RelationshipType } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";

interface HierarchyTraversalOptions {
	maxDepth?: number;
	includeRoot?: boolean;
}

/**
 * Generic function to recursively collect all nodes of a specific relationship type.
 * Uses depth-first traversal with cycle detection and the Indexer for relationship extraction.
 *
 * @param app - Obsidian app instance
 * @param indexer - Indexer instance for extracting relationships
 * @param startFile - Starting file
 * @param relationshipType - Type of relationship to traverse
 * @param options - Optional configuration for traversal
 * @returns Set of all related file paths (recursive)
 */
export function collectRelatedNodesRecursively(
	app: App,
	indexer: Indexer,
	startFile: TFile,
	relationshipType: RelationshipType,
	options: HierarchyTraversalOptions = {}
): Set<string> {
	const { maxDepth = Number.POSITIVE_INFINITY } = options;
	const visited = new Set<string>();
	const result = new Set<string>();

	const traverse = (filePath: string, depth = 0) => {
		if (visited.has(filePath)) {
			return;
		}
		visited.add(filePath);

		if (depth >= maxDepth) {
			return;
		}

		const file = app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;

		const cache = app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) return;

		const relationships = indexer.extractRelationships(file, frontmatter);
		const links = relationships[relationshipType];

		for (const wikiLink of links) {
			const linkPath = extractFilePath(wikiLink);
			const resolved = app.metadataCache.getFirstLinkpathDest(linkPath, filePath);

			if (resolved && !visited.has(resolved.path)) {
				result.add(resolved.path);
				traverse(resolved.path, depth + 1);
			}
		}
	};

	traverse(startFile.path);
	return result;
}

/**
 * Recursively traverses all children of a given file and returns their paths.
 * Uses depth-first traversal with cycle detection.
 *
 * @param app - Obsidian app instance
 * @param relationships - Starting file relationships
 * @param settings - Plugin settings to resolve property names
 * @param options - Optional configuration for traversal
 * @returns Array of all descendant file paths
 */
export function getChildrenRecursively(
	app: App,
	relationships: FileRelationships,
	settings: NexusPropertiesSettings,
	options: HierarchyTraversalOptions = {}
): string[] {
	const { maxDepth = Number.POSITIVE_INFINITY } = options;
	const visited = new Set<string>();
	const children: string[] = [];

	const traverse = (currentRelationships: FileRelationships, depth = 0) => {
		if (visited.has(currentRelationships.filePath)) {
			return;
		}
		visited.add(currentRelationships.filePath);

		if (depth >= maxDepth) {
			return;
		}

		const childrenLinks = parsePropertyLinks(currentRelationships.children);

		for (const childLink of childrenLinks) {
			const linkPath = extractFilePath(childLink);
			const childContext = getFileContext(app, linkPath);

			if (childContext.file && !visited.has(childContext.pathWithExt)) {
				children.push(childContext.pathWithExt);

				const childFrontmatter = app.metadataCache.getFileCache(childContext.file)?.frontmatter;
				if (childFrontmatter) {
					const childRelationships: FileRelationships = {
						filePath: childContext.pathWithExt,
						mtime: childContext.file.stat.mtime,
						parent: [],
						children: [],
						related: [],
						frontmatter: childFrontmatter,
					};

					for (const config of RELATIONSHIP_CONFIGS) {
						if (config.type === "children") {
							const propName = config.getProp(settings);
							const childrenValue = childFrontmatter[propName];
							childRelationships.children = parsePropertyLinks(childrenValue);
							break;
						}
					}

					traverse(childRelationships, depth + 1);
				}
			}
		}
	};

	traverse(relationships);
	return children;
}
