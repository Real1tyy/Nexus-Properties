import { getFileContext, parsePropertyLinks } from "@real1ty-obsidian-plugins/utils";
import type { App } from "obsidian";
import type { FileRelationships } from "../core/indexer";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";

export interface HierarchyTraversalOptions {
	maxDepth?: number;
	includeRoot?: boolean;
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
			const childContext = getFileContext(app, childLink);
			if (childContext.file && !visited.has(childContext.pathWithExt)) {
				children.push(childContext.pathWithExt);

				// Get child's relationships and traverse recursively
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

					// Extract children property
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
