import { extractFilePath, getFileContext, parsePropertyLinks } from "@real1ty-obsidian-plugins";
import { type App, TFile } from "obsidian";
import type { FileRelationships, Indexer } from "../core/indexer";
import { RELATIONSHIP_CONFIGS, type RelationshipType } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";

interface HierarchyTraversalOptions {
	maxDepth?: number;
	includeRoot?: boolean;
	/** Path to mark as the current file in the tree (for highlighting) */
	highlightPath?: string;
}

export interface TreeNode {
	path: string;
	name: string;
	children: TreeNode[];
	isCurrentFile?: boolean;
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

		const file = app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return node;

		const cache = app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) return node;

		const relationships = indexer.extractRelationships(file, frontmatter);

		for (const wikiLink of relationships.children) {
			const linkPath = extractFilePath(wikiLink);
			const resolved = app.metadataCache.getFirstLinkpathDest(linkPath, filePath);

			if (resolved && !visited.has(resolved.path)) {
				node.children.push(buildNode(resolved.path, depth + 1));
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
				const linkPath = extractFilePath(wikiLink);
				const resolved = app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
				if (!resolved) return null;
				return { wikiLink, path: resolved.path };
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

		const file = app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;

		const cache = app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) return;

		const relationships = indexer.extractRelationships(file, frontmatter);
		const validParents = resolveValidParents(relationships.parent, visited, filePath);

		// Check for prioritized parent
		const prioritizedPath = getPrioritizedParent(frontmatter, validParents);
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
	const { prioritizeParentProp, ...traversalOptions } = options;
	const rootPath = findTopmostParent(app, indexer, startFile.path, { prioritizeParentProp });
	const rootFile = app.vault.getAbstractFileByPath(rootPath);

	const fileToUse = rootFile instanceof TFile ? rootFile : startFile;
	return buildHierarchyTree(app, indexer, fileToUse, {
		...traversalOptions,
		highlightPath: startFile.path,
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
