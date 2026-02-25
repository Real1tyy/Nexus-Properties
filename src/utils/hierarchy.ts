import {
	extractDisplayName,
	extractFilePath,
	getFileContext,
	normalizeProperty,
	parsePropertyLinks,
} from "@real1ty-obsidian-plugins";
import type { App, TFile } from "obsidian";
import { RELATIONSHIP_CONFIGS, type FileRelationships, type RelationshipType } from "../types/constants";
import type { HierarchyTraversalOptions, RelationshipResolver } from "../types/hierarchy";
import type { NexusPropertiesSettings } from "../types/settings";

export type { HierarchyTraversalOptions };

export interface TreeNode {
	path: string;
	name: string;
	children: TreeNode[];
	isCurrentFile?: boolean;
}

/**
 * Resolves a file path to its relationships using the indexer.
 * Combines getFileContext + extractRelationships into a single call.
 *
 * @returns FileRelationships or null if the file doesn't exist or has no frontmatter
 */
export function getRelationships(app: App, indexer: RelationshipResolver, filePath: string): FileRelationships | null {
	const { file, frontmatter } = getFileContext(app, filePath);
	if (!file || !frontmatter) return null;
	return indexer.extractRelationships(file, frontmatter);
}

/**
 * Resolves a wiki link to a file path using Obsidian's link resolution.
 *
 * @returns Resolved file path, or null if unresolvable
 */
export function resolveWikiLink(app: App, wikiLink: string, sourcePath: string): string | null {
	const linkPath = extractFilePath(wikiLink);
	const resolved = app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
	return resolved?.path ?? null;
}

/**
 * Builds a tree structure starting from a file, traversing children relationships.
 * Uses depth-first traversal with cycle detection.
 *
 * @param app - Obsidian app instance
 * @param indexer - Indexer instance for extracting relationships
 * @param startFile - Starting file
 * @param options - Optional configuration for traversal
 * @returns TreeNode representing the hierarchy
 */
export function buildHierarchyTree(
	app: App,
	indexer: RelationshipResolver,
	startFile: TFile,
	options: HierarchyTraversalOptions = {}
): TreeNode {
	const { maxDepth = Number.POSITIVE_INFINITY, highlightPath, parentOverridePath, nodeFilter } = options;
	const visited = new Set<string>();

	const buildNode = (filePath: string, depth: number): TreeNode => {
		const name = extractDisplayName(filePath);

		const node: TreeNode = {
			path: filePath,
			name,
			children: [],
			isCurrentFile: highlightPath ? filePath === highlightPath : undefined,
		};

		if (visited.has(filePath) || depth >= maxDepth) {
			return node;
		}
		visited.add(filePath);

		const relationships = getRelationships(app, indexer, filePath);
		if (!relationships) return node;

		for (const wikiLink of relationships.children) {
			const resolvedPath = resolveWikiLink(app, wikiLink, filePath);
			if (!resolvedPath || visited.has(resolvedPath)) continue;
			// When a parent override is set, only allow the highlighted file
			// to appear as a child of the override parent
			if (parentOverridePath && resolvedPath === highlightPath && filePath !== parentOverridePath) {
				continue;
			}
			// Apply node filter on the child's frontmatter
			if (nodeFilter) {
				const childRels = getRelationships(app, indexer, resolvedPath);
				if (childRels && !nodeFilter(childRels.frontmatter)) continue;
			}
			node.children.push(buildNode(resolvedPath, depth + 1));
		}

		return node;
	};

	return buildNode(startFile.path, 0);
}

/**
 * Finds the topmost parent of a file by traversing upward through parent relationships.
 * Uses DFS with cycle detection.
 *
 * @param app - Obsidian app instance
 * @param indexer - Indexer instance for extracting relationships
 * @param startPath - Starting file path
 * @param options - Optional configuration
 * @returns Path of the topmost parent (or startPath if no parents found)
 */
export function findTopmostParent(
	app: App,
	indexer: RelationshipResolver,
	startPath: string,
	options: HierarchyTraversalOptions = {}
): string {
	const { maxDepth = 50, prioritizeParentProp, nodeFilter } = options;
	const visited = new Set<string>();
	let topmostParent = startPath;
	let maxLevel = 0;

	const resolveValidParents = (wikiLinks: string[], excludePaths: Set<string>, sourcePath: string) => {
		return wikiLinks
			.map((wikiLink) => {
				const resolvedPath = resolveWikiLink(app, wikiLink, sourcePath);
				if (!resolvedPath) return null;
				return { wikiLink, path: resolvedPath };
			})
			.filter((ctx): ctx is { wikiLink: string; path: string } => {
				if (ctx === null || excludePaths.has(ctx.path)) return false;
				if (nodeFilter) {
					const rels = getRelationships(app, indexer, ctx.path);
					if (rels && !nodeFilter(rels.frontmatter)) return false;
				}
				return true;
			});
	};

	const getPrioritizedParent = (
		frontmatter: Record<string, unknown>,
		validParents: Array<{ wikiLink: string; path: string }>
	): string | undefined => {
		if (!prioritizeParentProp || !frontmatter[prioritizeParentProp]) {
			return undefined;
		}

		const prioritizedValue = String(frontmatter[prioritizeParentProp]).trim();
		const prioritizedPath = extractFilePath(prioritizedValue);

		const matching = validParents.find((p) => {
			const parentPath = extractFilePath(p.wikiLink);
			return parentPath === prioritizedPath || p.path === prioritizedPath;
		});

		return matching?.path;
	};

	const dfsUpwards = (filePath: string, currentLevel: number): void => {
		if (currentLevel >= maxDepth || visited.has(filePath)) return;
		visited.add(filePath);

		if (currentLevel > maxLevel) {
			maxLevel = currentLevel;
			topmostParent = filePath;
		}

		const relationships = getRelationships(app, indexer, filePath);
		if (!relationships) return;

		const validParents = resolveValidParents(relationships.parent, visited, filePath);

		// Check for prioritized parent
		const prioritizedPath = getPrioritizedParent(relationships.frontmatter, validParents);
		if (prioritizedPath) {
			dfsUpwards(prioritizedPath, currentLevel + 1);
			return;
		}

		// Otherwise explore all parents
		for (const parent of validParents) {
			dfsUpwards(parent.path, currentLevel + 1);
		}
	};

	dfsUpwards(startPath, 0);
	return topmostParent;
}

/**
 * Builds a tree from the topmost parent, marking the current file.
 * First traverses upward to find the root, then builds tree downward.
 *
 * @param app - Obsidian app instance
 * @param indexer - Indexer instance
 * @param startFile - The current file (will be marked in tree)
 * @param options - Optional configuration
 * @returns TreeNode with isCurrentFile marked on the original file
 */
export function buildHierarchyTreeFromTopParent(
	app: App,
	indexer: RelationshipResolver,
	startFile: TFile,
	options: HierarchyTraversalOptions = {}
): TreeNode {
	const rootPath = options.parentOverridePath
		? findTopmostParent(app, indexer, options.parentOverridePath, options)
		: findTopmostParent(app, indexer, startFile.path, options);
	const rootFile = app.vault.getAbstractFileByPath(rootPath);

	const fileToUse = rootFile ? (rootFile as TFile) : startFile;
	return buildHierarchyTree(app, indexer, fileToUse, {
		...options,
		highlightPath: options.highlightPath ?? startFile.path,
	});
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
	indexer: RelationshipResolver,
	startFile: TFile,
	relationshipType: RelationshipType,
	options: HierarchyTraversalOptions = {}
): Set<string> {
	const { maxDepth = Number.POSITIVE_INFINITY } = options;
	const visited = new Set<string>();
	const result = new Set<string>();

	const traverse = (filePath: string, depth = 0) => {
		if (visited.has(filePath) || depth >= maxDepth) return;
		visited.add(filePath);

		const relationships = getRelationships(app, indexer, filePath);
		if (!relationships) return;

		for (const wikiLink of relationships[relationshipType]) {
			const resolvedPath = resolveWikiLink(app, wikiLink, filePath);
			if (resolvedPath && !visited.has(resolvedPath)) {
				result.add(resolvedPath);
				traverse(resolvedPath, depth + 1);
			}
		}
	};

	traverse(startFile.path);
	return result;
}

/**
 * Builds a tree rooted at a file, expanding only related properties recursively.
 * No children hierarchy is included — purely related-based traversal.
 * Uses BFS so level 1 contains all direct related items before expanding deeper.
 */
export function buildRelatedTree(
	app: App,
	indexer: RelationshipResolver,
	startFile: TFile,
	options: HierarchyTraversalOptions = {}
): TreeNode {
	const { nodeFilter, maxDepth = Number.POSITIVE_INFINITY } = options;
	const visited = new Set<string>();

	const rootPath = startFile.path;
	const root: TreeNode = { path: rootPath, name: extractDisplayName(rootPath), children: [] };
	visited.add(rootPath);

	const queue: Array<[TreeNode, number]> = [[root, 0]];

	while (queue.length > 0) {
		const [parentNode, depth] = queue.shift()!;
		if (depth >= maxDepth) continue;

		const relationships = getRelationships(app, indexer, parentNode.path);
		if (!relationships) continue;

		for (const wikiLink of relationships.related) {
			const resolvedPath = resolveWikiLink(app, wikiLink, parentNode.path);
			if (!resolvedPath || visited.has(resolvedPath)) continue;
			if (nodeFilter) {
				const childRels = getRelationships(app, indexer, resolvedPath);
				if (childRels && !nodeFilter(childRels.frontmatter)) continue;
			}

			visited.add(resolvedPath);
			const childNode: TreeNode = { path: resolvedPath, name: extractDisplayName(resolvedPath), children: [] };
			parentNode.children.push(childNode);
			queue.push([childNode, depth + 1]);
		}
	}

	return root;
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
							childRelationships.children = normalizeProperty(childrenValue);
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
