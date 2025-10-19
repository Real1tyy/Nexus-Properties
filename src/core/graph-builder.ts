import type { ElementDefinition } from "cytoscape";
import type { App, TFile } from "obsidian";
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

interface ValidFileContext {
	wikiLink: string;
	path: string;
	file: TFile;
	frontmatter: Record<string, unknown>;
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

	private resolveValidContexts(wikiLinks: string[], excludePaths: Set<string>): ValidFileContext[] {
		return wikiLinks
			.map((wikiLink) => {
				const path = extractFilePath(wikiLink);
				const { file, frontmatter } = getFileContext(this.app, path);
				return { wikiLink, path, file, frontmatter };
			})
			.filter(
				(ctx): ctx is ValidFileContext => ctx.file !== null && ctx.frontmatter !== null && !excludePaths.has(ctx.path)
			);
	}

	private createNodeElement(pathOrWikiLink: string, level: number, isSource: boolean): ElementDefinition {
		const filePath = extractFilePath(pathOrWikiLink);
		const displayName = extractDisplayName(pathOrWikiLink);
		const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
		const estimatedHeight = 45;

		const { frontmatter } = getFileContext(this.app, filePath);
		const nodeColor = this.colorEvaluator.evaluateColor(frontmatter ?? {});

		return {
			data: {
				id: filePath,
				label: displayName,
				level: level,
				isSource: isSource,
				width: estimatedWidth,
				height: estimatedHeight,
				nodeColor: nodeColor,
			},
		};
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
		const processedPaths = new Set<string>([sourcePath]);
		const sourceNode = this.createNodeElement(sourcePath, 0, true);

		const { file, frontmatter } = getFileContext(this.app, sourcePath);
		if (!file || !frontmatter) {
			return { nodes: [sourceNode], edges: [] };
		}

		const relations = this.indexer.extractRelationships(file, frontmatter);
		const allRelated = includeAllRelated
			? this.computeAllRelatedRecursively(sourcePath, relations.related)
			: relations.related;

		const validContexts = this.resolveValidContexts(allRelated, processedPaths);

		const relatedNodes = validContexts.map((ctx) => this.createNodeElement(ctx.wikiLink, 1, false));

		const edges = validContexts.map((ctx) => ({ data: { source: sourcePath, target: ctx.path } }));

		return {
			nodes: [sourceNode, ...relatedNodes],
			edges,
		};
	}

	private buildHierarchyGraphData(sourcePath: string, startFromCurrent: boolean): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = new Set<string>();

		const rootPath = startFromCurrent ? sourcePath : this.findTopmostParent(sourcePath);
		const rootNode = this.createNodeElement(rootPath, 0, rootPath === sourcePath);
		nodes.push(rootNode);
		processedPaths.add(rootPath);

		const queue: Array<{ path: string; level: number }> = [{ path: rootPath, level: 0 }];

		while (queue.length > 0) {
			const { path: currentPath, level: currentLevel } = queue.shift()!;

			// safety check to prevent infinite loops
			if (currentLevel > 30) continue;

			const { file, frontmatter } = getFileContext(this.app, currentPath);
			if (!file || !frontmatter) continue;

			const relations = this.indexer.extractRelationships(file, frontmatter);
			const validChildren = this.resolveValidContexts(relations.children, processedPaths);

			const childNodes = validChildren.map((ctx) =>
				this.createNodeElement(ctx.wikiLink, currentLevel + 1, ctx.path === sourcePath)
			);

			const childEdges = validChildren.map((ctx) => ({ data: { source: currentPath, target: ctx.path } }));

			nodes.push(...childNodes);
			edges.push(...childEdges);

			validChildren.forEach((ctx) => {
				processedPaths.add(ctx.path);
				queue.push({ path: ctx.path, level: currentLevel + 1 });
			});
		}

		return { nodes, edges };
	}

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

			const { file, frontmatter } = getFileContext(this.app, filePath);
			if (!file || !frontmatter) return;

			const relations = this.indexer.extractRelationships(file, frontmatter);
			const validParents = this.resolveValidContexts(relations.parent, visited);

			validParents.forEach((ctx) => {
				dfsUpwards(ctx.path, currentLevel + 1);
			});
		};

		dfsUpwards(startPath, 0);
		return topmostParent;
	}

	private computeAllRelatedRecursively(sourceFilePath: string, directRelated: string[]): string[] {
		const visited = new Set<string>([sourceFilePath]);
		const allRelated: string[] = [];

		const collectRelated = (relatedItems: string[]): void => {
			const validContexts = this.resolveValidContexts(relatedItems, visited);

			validContexts.forEach((ctx) => {
				visited.add(ctx.path);
				allRelated.push(ctx.wikiLink);

				const nestedRels = this.indexer.extractRelationships(ctx.file, ctx.frontmatter);
				collectRelated(nestedRels.related);
			});
		};

		collectRelated(directRelated);
		return allRelated;
	}

	private applyGraphFilters(graphData: GraphData, searchQuery?: string): GraphData {
		const filteredNodes = graphData.nodes.filter((node) => {
			const { id, isSource, label } = node.data || {};
			if (!id) return false;

			// Always keep source node
			if (isSource) return true;

			// Apply search filter if active
			if (searchQuery) {
				const nodeName = ((label as string) || "").toLowerCase();
				if (!nodeName.includes(searchQuery.toLowerCase())) {
					return false;
				}
			}

			// Apply frontmatter filters
			const { frontmatter } = getFileContext(this.app, id);
			return this.filterEvaluator.evaluateFilters(frontmatter ?? {});
		});

		const keepNodeIds = new Set(filteredNodes.map((node) => node.data?.id as string));

		const filteredEdges = graphData.edges.filter(
			(edge) => keepNodeIds.has(edge.data?.source as string) && keepNodeIds.has(edge.data?.target as string)
		);

		return { nodes: filteredNodes, edges: filteredEdges };
	}
}
