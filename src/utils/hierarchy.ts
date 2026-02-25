import { extractFilePath, getFileContext, normalizeProperty, parsePropertyLinks } from "@real1ty-obsidian-plugins";
import { type App, TFile } from "obsidian";
import type { FileRelationships, Indexer } from "../core/indexer";
import { RELATIONSHIP_CONFIGS, type RelationshipType } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";

interface HierarchyTraversalOptions {
	maxDepth?: number;
	includeRoot?: boolean;
	/** Path to mark as the current file in the tree (for highlighting) */
	highlightPath?: string;
	/** Start upward traversal from this parent path instead of the current file */
	parentOverridePath?: string;
}

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
function getRelationships(app: App, indexer: Indexer, filePath: string): FileRelationships | null {
	const { file, frontmatter } = getFileContext(app, filePath);
	if (!file || !frontmatter) return null;
	return indexer.extractRelationships(file, frontmatter);
}

/**
 * Resolves a wiki link to a file path using Obsidian's link resolution.
 *
 * @returns Resolved file path, or null if unresolvable
 */
function resolveWikiLink(app: App, wikiLink: string, sourcePath: string): string | null {
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
	indexer: Indexer,
	startFile: TFile,
	options: HierarchyTraversalOptions = {}
): TreeNode {
	const { maxDepth = Number.POSITIVE_INFINITY, highlightPath } = options;
	const visited = new Set<string>();

	const buildNode = (filePath: string, depth: number): TreeNode => {
		const name = filePath.replace(/\.md$/, "").split("/").pop() || filePath;

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
			if (resolvedPath && !visited.has(resolvedPath)) {
				node.children.push(buildNode(resolvedPath, depth + 1));
			}
		}

		return node;
	};

	return buildNode(startFile.path, 0);
}

interface FindTopmostParentOptions {
	maxDepth?: number;
	prioritizeParentProp?: string;
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
	indexer: Indexer,
	startPath: string,
	options: FindTopmostParentOptions = {}
): string {
	const { maxDepth = 50, prioritizeParentProp } = options;
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
				return ctx !== null && !excludePaths.has(ctx.path);
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
	indexer: Indexer,
	startFile: TFile,
	options: HierarchyTraversalOptions & FindTopmostParentOptions = {}
): TreeNode {
	const { prioritizeParentProp, parentOverridePath, ...traversalOptions } = options;
	// When a parent override is set, use it directly as the root
	const rootPath = parentOverridePath ?? findTopmostParent(app, indexer, startFile.path, { prioritizeParentProp });
	const rootFile = app.vault.getAbstractFileByPath(rootPath);

	const fileToUse = rootFile instanceof TFile ? rootFile : startFile;
	return buildHierarchyTree(app, indexer, fileToUse, {
		...traversalOptions,
		highlightPath: traversalOptions.highlightPath ?? startFile.path,
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
	indexer: Indexer,
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
 * Augments an existing tree by recursively adding "Related" nodes from frontmatter
 * as additional children at every level. Works with any tree regardless of hierarchy source.
 * Uses breadth-first traversal so that all level-1 related nodes are added before
 * level-2, ensuring lower levels render first in the tree.
 *
 * @param app - Obsidian app instance
 * @param indexer - Indexer instance for extracting relationships
 * @param root - Tree root node to augment (mutated in place)
 */
export function augmentTreeWithRelated(app: App, indexer: Indexer, root: TreeNode): void {
	const visited = new Set<string>();

	// Collect all existing nodes in the tree so we don't revisit them
	const collectExisting = (node: TreeNode): void => {
		visited.add(node.path);
		for (const child of node.children) {
			collectExisting(child);
		}
	};
	collectExisting(root);

	// BFS queue: each entry is a parent node whose related nodes we need to fetch
	const queue: TreeNode[] = [root, ...getAllDescendants(root)];

	while (queue.length > 0) {
		// Process entire current level before moving to next
		const currentLevel = [...queue];
		queue.length = 0;

		for (const parentNode of currentLevel) {
			const relationships = getRelationships(app, indexer, parentNode.path);
			if (!relationships) continue;

			for (const wikiLink of relationships.related) {
				const resolvedPath = resolveWikiLink(app, wikiLink, parentNode.path);
				if (resolvedPath && !visited.has(resolvedPath)) {
					visited.add(resolvedPath);
					const name = resolvedPath.replace(/\.md$/, "").split("/").pop() || resolvedPath;
					const relatedNode: TreeNode = {
						path: resolvedPath,
						name,
						children: [],
					};
					parentNode.children.push(relatedNode);
					queue.push(relatedNode);
				}
			}
		}
	}
}

/**
 * Builds a tree rooted at a file, expanding only related properties recursively.
 * No children hierarchy is included — purely related-based traversal.
 */
export function buildRelatedTree(app: App, indexer: Indexer, startFile: TFile): TreeNode {
	const visited = new Set<string>();

	const buildNode = (filePath: string): TreeNode => {
		const nodeName = filePath.replace(/\.md$/, "").split("/").pop() || filePath;
		const node: TreeNode = { path: filePath, name: nodeName, children: [] };

		if (visited.has(filePath)) return node;
		visited.add(filePath);

		const relationships = getRelationships(app, indexer, filePath);
		if (!relationships) return node;

		for (const wikiLink of relationships.related) {
			const resolvedPath = resolveWikiLink(app, wikiLink, filePath);
			if (resolvedPath && !visited.has(resolvedPath)) {
				node.children.push(buildNode(resolvedPath));
			}
		}

		return node;
	};

	return buildNode(startFile.path);
}

/** Collects all descendant nodes of a tree node (flat list). */
function getAllDescendants(node: TreeNode): TreeNode[] {
	const result: TreeNode[] = [];
	for (const child of node.children) {
		result.push(child);
		result.push(...getAllDescendants(child));
	}
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
