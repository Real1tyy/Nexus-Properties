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

	/**
	 * Build graph data based on provided options
	 */
	buildGraph(options: GraphBuilderOptions): GraphData {
		let graphData: GraphData;

		if (options.renderRelated) {
			graphData = this.buildRelatedGraphData(options.sourcePath, options.includeAllRelated);
		} else {
			graphData = this.buildHierarchyGraphData(options.sourcePath, options.startFromCurrent);
		}

		// Apply filtering
		return this.applyGraphFilters(graphData, options.searchQuery);
	}

	/**
	 * Build constellation/related view - shows current file and all related nodes in circular layout
	 */
	private buildRelatedGraphData(sourcePath: string, includeAllRelated: boolean): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		// Add central node (current file)
		this.addNodeToGraph(nodes, processedNodes, sourcePath, 0, true);

		// Get relationships for current file
		const context = getFileContext(this.app, sourcePath);
		if (context.file && context.frontmatter) {
			const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

			const allRelated = includeAllRelated
				? this.computeAllRelatedRecursively(sourcePath, rels.related)
				: [...rels.related];

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

	/**
	 * Build hierarchy view - shows parent-child relationships from root
	 */
	private buildHierarchyGraphData(sourcePath: string, startFromCurrent: boolean): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		const rootPath = startFromCurrent ? sourcePath : this.findTopmostParent(sourcePath);

		const queue: Array<{ path: string; level: number }> = [{ path: rootPath, level: 0 }];
		this.addNodeToGraph(nodes, processedNodes, rootPath, 0, rootPath === sourcePath);

		while (queue.length > 0) {
			const { path: currentPath, level: currentLevel } = queue.shift()!;

			if (currentLevel > 50) continue;

			const context = getFileContext(this.app, currentPath);
			if (!context.file || !context.frontmatter) continue;

			const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

			for (const childWikiLink of rels.children) {
				const childPath = extractFilePath(childWikiLink);

				if (!processedNodes.has(childPath)) {
					const isSource = childPath === sourcePath;
					this.addNodeToGraph(nodes, processedNodes, childWikiLink, currentLevel + 1, isSource);

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

	/**
	 * Add a single node to the graph
	 */
	private addNodeToGraph(
		nodes: ElementDefinition[],
		processedNodes: Set<string>,
		pathOrWikiLink: string,
		level: number,
		isSource: boolean
	): void {
		const filePath = extractFilePath(pathOrWikiLink);
		if (processedNodes.has(filePath)) return;

		processedNodes.add(filePath);
		const displayName = extractDisplayName(pathOrWikiLink);

		const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
		const estimatedHeight = 45;

		const context = getFileContext(this.app, filePath);
		const nodeColor = this.colorEvaluator.evaluateColor(context.frontmatter ?? {});

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
	}

	/**
	 * Find the topmost parent in the hierarchy by traversing upwards
	 */
	private findTopmostParent(startPath: string, maxDepth = 50): string {
		const visited = new Set<string>();
		let topmostParent = startPath;
		let maxLevel = 0;

		const dfsUpwards = (filePath: string, currentLevel: number): void => {
			if (currentLevel > maxDepth || visited.has(filePath)) return;
			visited.add(filePath);

			if (currentLevel > maxLevel) {
				maxLevel = currentLevel;
				topmostParent = filePath;
			}

			const context = getFileContext(this.app, filePath);
			if (!context.file || !context.frontmatter) return;

			const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

			for (const parentWikiLink of rels.parent) {
				const parentPath = extractFilePath(parentWikiLink);

				if (!visited.has(parentPath)) {
					dfsUpwards(parentPath, currentLevel + 1);
				}
			}
		};

		dfsUpwards(startPath, 0);
		return topmostParent;
	}

	/**
	 * Recursively collect all related nodes
	 */
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

	/**
	 * Apply search and frontmatter filters to graph data
	 */
	private applyGraphFilters(graphData: GraphData, searchQuery?: string): GraphData {
		const keepNodeIds = new Set<string>();

		for (const n of graphData.nodes) {
			const id = n.data?.id as string | undefined;
			if (!id) continue;

			// Always keep source node
			if (n.data?.isSource) {
				keepNodeIds.add(id);
				continue;
			}

			// Apply search filter if active
			if (searchQuery) {
				const nodeName = ((n.data?.label as string) || "").toLowerCase();
				if (!nodeName.includes(searchQuery.toLowerCase())) {
					continue;
				}
			}

			// Apply frontmatter filters
			const context = getFileContext(this.app, id);
			const fm = context.frontmatter ?? {};
			const matchesAllFilters = this.filterEvaluator.evaluateFilters(fm);
			if (matchesAllFilters) {
				keepNodeIds.add(id);
			}
		}

		const filteredNodes = graphData.nodes.filter((n) => keepNodeIds.has(n.data?.id as string));
		const filteredEdges = graphData.edges.filter(
			(e) => keepNodeIds.has(e.data?.source as string) && keepNodeIds.has(e.data?.target as string)
		);

		return { nodes: filteredNodes, edges: filteredEdges };
	}
}
