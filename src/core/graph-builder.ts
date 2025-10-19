import type { ElementDefinition } from "cytoscape";
import type { App } from "obsidian";
import { ColorEvaluator } from "../utils/colors";
import { extractDisplayName, extractFilePath, getFileContext } from "../utils/file";
import { FilterEvaluator } from "../utils/filters";
import type { Indexer } from "./indexer";
import type { SettingsStore } from "./settings-store";

export interface GraphData {
	nodes: ElementDefinition[];
	edges: ElementDefinition[];
}

export interface GraphBuilderOptions {
	sourcePath: string;
	renderRelated: boolean;
	includeAllRelated: boolean;
	startFromCurrent: boolean;
	searchQuery?: string;
}

/**
 * Builds graph data (nodes and edges) from file relationships.
 * Handles both hierarchy and constellation view modes.
 */
export class GraphBuilder {
	private readonly filterEvaluator: FilterEvaluator;
	private readonly colorEvaluator: ColorEvaluator;

	constructor(
		private readonly app: App,
		private readonly indexer: Indexer,
		settingsStore: SettingsStore
	) {
		this.filterEvaluator = new FilterEvaluator(settingsStore.settings$);
		this.colorEvaluator = new ColorEvaluator(settingsStore.settings$);
	}

	buildGraph(options: GraphBuilderOptions): GraphData {
		let graphData: GraphData;

		if (options.renderRelated) {
			graphData = this.buildRelatedGraphData(options.sourcePath, options.includeAllRelated);
		} else {
			graphData = this.buildHierarchyGraphData(options.sourcePath, options.startFromCurrent);
		}

		return this.applyGraphFilters(graphData, options.searchQuery);
	}

	private buildRelatedGraphData(sourcePath: string, includeAllRelated: boolean): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		this.addNodeToGraph(nodes, processedNodes, sourcePath, 0, true);

		const { file, frontmatter } = getFileContext(this.app, sourcePath);
		if (file && frontmatter) {
			const relations = this.indexer.extractRelationships(file, frontmatter);

			const allRelated = includeAllRelated
				? this.computeAllRelatedRecursively(sourcePath, relations.related)
				: [...relations.related];

			for (const relatedWikiLink of allRelated) {
				const relatedPath = extractFilePath(relatedWikiLink);

				if (!processedNodes.has(relatedPath)) {
					this.addNodeToGraph(nodes, processedNodes, relatedWikiLink, 1, false);

					edges.push({
						data: {
							source: sourcePath,
							target: relatedPath,
						},
					});
				}
			}
		}

		return { nodes, edges };
	}

	private buildHierarchyGraphData(sourcePath: string, startFromCurrent: boolean): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		const rootPath = startFromCurrent ? sourcePath : this.findTopmostParent(sourcePath);

		const queue: Array<{ path: string; level: number }> = [{ path: rootPath, level: 0 }];
		this.addNodeToGraph(nodes, processedNodes, rootPath, 0, rootPath === sourcePath);

		while (queue.length > 0) {
			const { path: currentPath, level: currentLevel } = queue.shift()!;

			// safety check to prevent infinite loops
			if (currentLevel > 30) continue;

			const { file, frontmatter } = getFileContext(this.app, currentPath);
			if (!file || !frontmatter) continue;

			const relations = this.indexer.extractRelationships(file, frontmatter);

			for (const childWikiLink of relations.children) {
				const childPath = extractFilePath(childWikiLink);

				const isSource = childPath === sourcePath;
				const added = this.addNodeToGraph(nodes, processedNodes, childWikiLink, currentLevel + 1, isSource);
				if (added) {
					edges.push({
						data: {
							source: currentPath,
							target: childPath,
						},
					});
					queue.push({ path: childPath, level: currentLevel + 1 });
				}
			}
		}

		return { nodes, edges };
	}

	private addNodeToGraph(
		nodes: ElementDefinition[],
		processedPaths: Set<string>,
		pathOrWikiLink: string,
		level: number,
		isSource: boolean
	): boolean {
		const filePath = extractFilePath(pathOrWikiLink);
		if (processedPaths.has(filePath)) return false;
		processedPaths.add(filePath);

		const displayName = extractDisplayName(pathOrWikiLink);

		const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
		const estimatedHeight = 45;

		const { frontmatter } = getFileContext(this.app, filePath);
		const nodeColor = this.colorEvaluator.evaluateColor(frontmatter ?? {});

		nodes.push({
			data: {
				id: filePath,
				label: displayName,
				level: level,
				isSource: isSource,
				width: estimatedWidth,
				height: estimatedHeight,
				nodeColor: nodeColor,
			},
		});

		return true;
	}

	private findTopmostParent(startPath: string, maxDepth = 50): string {
		const visited = new Set<string>();
		let topmostParent = startPath;
		let maxLevel = 0;

		const dfsUpwards = (filePath: string, currentLevel: number): void => {
			if (currentLevel > maxDepth || visited.has(filePath)) return;
			visited.add(filePath);

			if (currentLevel > maxLevel) maxLevel = currentLevel;
			if (currentLevel > maxLevel) topmostParent = filePath;

			const { file, frontmatter } = getFileContext(this.app, filePath);
			if (!file || !frontmatter) return;

			const relations = this.indexer.extractRelationships(file, frontmatter);

			for (const parentWikiLink of relations.parent) {
				const parentPath = extractFilePath(parentWikiLink);

				if (!visited.has(parentPath)) {
					dfsUpwards(parentPath, currentLevel + 1);
				}
			}
		};

		dfsUpwards(startPath, 0);
		return topmostParent;
	}

	private computeAllRelatedRecursively(sourceFilePath: string, directRelated: string[]): string[] {
		const visited = new Set<string>([sourceFilePath]);
		const allRelated: string[] = [];

		const collectRelated = (relatedItems: string[]): void => {
			for (const relatedWikiLink of relatedItems) {
				const relatedPath = extractFilePath(relatedWikiLink);
				const relatedContext = getFileContext(this.app, relatedPath);

				if (visited.has(relatedContext.pathWithExt)) {
					continue;
				}

				visited.add(relatedContext.pathWithExt);
				allRelated.push(relatedWikiLink);

				if (!relatedContext.file || !relatedContext.frontmatter) {
					continue;
				}

				const nestedRels = this.indexer.extractRelationships(relatedContext.file, relatedContext.frontmatter);
				collectRelated(nestedRels.related);
			}
		};

		collectRelated(directRelated);
		return allRelated;
	}

	private applyGraphFilters(graphData: GraphData, searchQuery?: string): GraphData {
		const filteredNodes: ElementDefinition[] = [];
		const keepNodeIds = new Set<string>();

		const includeSourceNode = (node: ElementDefinition): void => {
			filteredNodes.push(node);
			keepNodeIds.add(node.data?.id as string);
		};

		for (const node of graphData.nodes) {
			const { id } = node.data;
			if (!id) continue;

			// Always keep source node
			if (node.data?.isSource) {
				includeSourceNode(node);
				continue;
			}

			// Apply search filter if active
			if (searchQuery) {
				const nodeName = ((node.data?.label as string) || "").toLowerCase();
				if (!nodeName.includes(searchQuery.toLowerCase())) {
					continue;
				}
			}

			// Apply frontmatter filters
			const { frontmatter } = getFileContext(this.app, id);
			if (this.filterEvaluator.evaluateFilters(frontmatter ?? {})) {
				includeSourceNode(node);
			}
		}

		const filteredEdges = graphData.edges.filter(
			(e) => keepNodeIds.has(e.data?.source as string) && keepNodeIds.has(e.data?.target as string)
		);

		return { nodes: filteredNodes, edges: filteredEdges };
	}
}
