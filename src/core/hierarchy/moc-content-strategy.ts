import { type App, TFile } from "obsidian";
import type { Indexer } from "../indexer";
import type { NexusPropertiesSettings } from "../../types/settings";
import type { RelationshipType } from "../../types/constants";
import { collectRelatedNodesRecursively, type TreeNode } from "../../utils/hierarchy";
import { type MocNode, parseMocContent, findAncestorPaths } from "../../utils/moc-parser";
import type { HierarchyStrategy, HierarchyTraversalOptions } from "./hierarchy-strategy";

/**
 * MOC Content-based hierarchy strategy.
 * Parses markdown bullet lists to build hierarchy.
 */
export class MocContentStrategy implements HierarchyStrategy {
	private mocCache = new Map<string, { roots: MocNode[]; allLinks: Set<string> }>();

	constructor(
		private app: App,
		private indexer: Indexer,
		private getSettings: () => NexusPropertiesSettings
	) {}

	private getMocData(mocFilePath: string): { roots: MocNode[]; allLinks: Set<string> } {
		const cached = this.mocCache.get(mocFilePath);
		if (cached) return cached;

		return { roots: [], allLinks: new Set() };
	}

	async loadMocDataAsync(mocFilePath: string): Promise<{ roots: MocNode[]; allLinks: Set<string> }> {
		const cached = this.mocCache.get(mocFilePath);
		if (cached) return cached;

		const file = this.app.vault.getAbstractFileByPath(mocFilePath);
		if (!(file instanceof TFile)) {
			return { roots: [], allLinks: new Set() };
		}

		const content = await this.app.vault.cachedRead(file);
		const result = parseMocContent(content);
		this.mocCache.set(mocFilePath, result);
		return result;
	}

	clearCache(mocFilePath?: string): void {
		if (mocFilePath) {
			this.mocCache.delete(mocFilePath);
		} else {
			this.mocCache.clear();
		}
	}

	buildTree(startFile: TFile, options: HierarchyTraversalOptions = {}): TreeNode {
		const { highlightPath, mocFilePath } = options;
		if (!mocFilePath) {
			return { path: startFile.path, name: startFile.basename, children: [], isCurrentFile: true };
		}

		const { roots } = this.getMocData(mocFilePath);
		const startPath = this.normalizeNotePath(startFile.path);

		if (startFile.path === mocFilePath) {
			return {
				path: startFile.path,
				name: startFile.basename,
				children: roots.map((node) => this.convertMocNodeToTreeNode(node, highlightPath, mocFilePath)),
				isCurrentFile: startFile.path === highlightPath,
			};
		}

		const mocNode = this.findMocNodeByPath(roots, startPath);
		if (mocNode) {
			return this.convertMocNodeToTreeNode(mocNode, highlightPath, mocFilePath);
		}

		return {
			path: startFile.path,
			name: startFile.basename,
			children: [],
			isCurrentFile: startFile.path === highlightPath,
		};
	}

	buildTreeFromTopParent(startFile: TFile, options: HierarchyTraversalOptions = {}): TreeNode {
		const { highlightPath = startFile.path, mocFilePath } = options;
		if (!mocFilePath) {
			return { path: startFile.path, name: startFile.basename, children: [], isCurrentFile: true };
		}

		const { roots } = this.getMocData(mocFilePath);

		if (startFile.path === mocFilePath) {
			return {
				path: startFile.path,
				name: startFile.basename,
				children: roots.map((node) => this.convertMocNodeToTreeNode(node, highlightPath, mocFilePath)),
				isCurrentFile: startFile.path === highlightPath,
			};
		}

		const startPath = this.normalizeNotePath(startFile.path);
		const ancestorPaths = findAncestorPaths(roots, startPath);

		const mocFile = this.app.vault.getAbstractFileByPath(mocFilePath);
		if (mocFile instanceof TFile && (ancestorPaths.length > 0 || this.findMocNodeByPath(roots, startPath))) {
			return {
				path: mocFilePath,
				name: mocFile.basename,
				children: roots.map((node) => this.convertMocNodeToTreeNode(node, highlightPath, mocFilePath)),
				isCurrentFile: mocFilePath === highlightPath,
			};
		}

		return this.buildTree(startFile, options);
	}

	findChildren(filePath: string, mocFilePath?: string): string[] {
		if (!mocFilePath) return [];

		const { roots } = this.getMocData(mocFilePath);

		if (filePath === mocFilePath) {
			return roots
				.map((node) => this.resolveNotePath(node.notePath, mocFilePath))
				.filter((p): p is string => p !== null);
		}

		const normalizedPath = this.normalizeNotePath(filePath);
		const mocNode = this.findMocNodeByPath(roots, normalizedPath);

		if (!mocNode) return [];

		return mocNode.children
			.map((child) => this.resolveNotePath(child.notePath, mocFilePath))
			.filter((p): p is string => p !== null);
	}

	findParents(filePath: string, mocFilePath?: string): string[] {
		if (!mocFilePath) return [];

		const { roots } = this.getMocData(mocFilePath);
		const normalizedPath = this.normalizeNotePath(filePath);

		const isTopLevel = roots.some((n) => this.normalizeNotePath(n.notePath) === normalizedPath);
		if (isTopLevel) {
			return [mocFilePath];
		}

		const ancestorPaths = findAncestorPaths(roots, normalizedPath);

		if (ancestorPaths.length > 0) {
			const parentPath = ancestorPaths[ancestorPaths.length - 1];
			const resolved = this.resolveNotePath(parentPath, mocFilePath);
			return resolved ? [resolved] : [];
		}

		return [];
	}

	collectRelatedNodesRecursively(
		startFile: TFile,
		relationshipType: RelationshipType,
		options: HierarchyTraversalOptions = {}
	): Set<string> {
		const { mocFilePath } = options;
		if (!mocFilePath) return new Set();

		const { roots } = this.getMocData(mocFilePath);
		const result = new Set<string>();
		const { maxDepth = Number.POSITIVE_INFINITY } = options;
		const visited = new Set<string>();

		const startPath = this.normalizeNotePath(startFile.path);

		if (relationshipType === "children") {
			this.collectChildrenRecursively(roots, mocFilePath, startPath, result, visited, 0, maxDepth);
		} else if (relationshipType === "parent") {
			this.collectParentsRecursively(roots, mocFilePath, startPath, result, visited);
		} else {
			return collectRelatedNodesRecursively(this.app, this.indexer, startFile, relationshipType, options);
		}

		return result;
	}

	private collectChildrenRecursively(
		roots: MocNode[],
		mocFilePath: string,
		notePath: string,
		result: Set<string>,
		visited: Set<string>,
		depth: number,
		maxDepth: number
	): void {
		if (visited.has(notePath) || depth >= maxDepth) return;
		visited.add(notePath);

		const normalizedMocPath = this.normalizeNotePath(mocFilePath);
		if (notePath === normalizedMocPath) {
			for (const rootNode of roots) {
				const resolvedPath = this.resolveNotePath(rootNode.notePath, mocFilePath);
				if (resolvedPath && !visited.has(this.normalizeNotePath(resolvedPath))) {
					result.add(resolvedPath);
					this.collectChildrenRecursively(
						roots,
						mocFilePath,
						this.normalizeNotePath(rootNode.notePath),
						result,
						visited,
						depth + 1,
						maxDepth
					);
				}
			}
			return;
		}

		const mocNode = this.findMocNodeByPath(roots, notePath);
		if (!mocNode) return;

		for (const child of mocNode.children) {
			const resolvedPath = this.resolveNotePath(child.notePath, mocFilePath);
			if (resolvedPath && !visited.has(this.normalizeNotePath(resolvedPath))) {
				result.add(resolvedPath);
				this.collectChildrenRecursively(
					roots,
					mocFilePath,
					this.normalizeNotePath(child.notePath),
					result,
					visited,
					depth + 1,
					maxDepth
				);
			}
		}
	}

	private collectParentsRecursively(
		roots: MocNode[],
		mocFilePath: string,
		notePath: string,
		result: Set<string>,
		visited: Set<string>
	): void {
		if (visited.has(notePath)) return;
		visited.add(notePath);

		const normalizedMocPath = this.normalizeNotePath(mocFilePath);
		if (notePath === normalizedMocPath) return;

		const isTopLevel = roots.some((n) => this.normalizeNotePath(n.notePath) === notePath);
		if (isTopLevel) {
			result.add(mocFilePath);
			return;
		}

		const ancestorPaths = findAncestorPaths(roots, notePath);
		for (const ancestorPath of ancestorPaths) {
			const resolvedPath = this.resolveNotePath(ancestorPath, mocFilePath);
			if (resolvedPath) {
				result.add(resolvedPath);
			}
		}
		if (ancestorPaths.length > 0) {
			result.add(mocFilePath);
		}
	}

	private findMocNodeByPath(nodes: MocNode[], targetPath: string): MocNode | undefined {
		for (const node of nodes) {
			if (this.normalizeNotePath(node.notePath) === targetPath) {
				return node;
			}
			const found = this.findMocNodeByPath(node.children, targetPath);
			if (found) return found;
		}
		return undefined;
	}

	private convertMocNodeToTreeNode(mocNode: MocNode, highlightPath: string | undefined, mocFilePath: string): TreeNode {
		const resolvedPath = this.resolveNotePath(mocNode.notePath, mocFilePath) || mocNode.notePath + ".md";

		return {
			path: resolvedPath,
			name: mocNode.displayText,
			children: mocNode.children.map((child) => this.convertMocNodeToTreeNode(child, highlightPath, mocFilePath)),
			isCurrentFile: highlightPath ? resolvedPath === highlightPath : undefined,
		};
	}

	private normalizeNotePath(notePath: string): string {
		return notePath.replace(/\.md$/, "");
	}

	private resolveNotePath(notePath: string, mocFilePath: string): string | null {
		const resolved = this.app.metadataCache.getFirstLinkpathDest(notePath, mocFilePath);
		return resolved?.path || null;
	}
}
