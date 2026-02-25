import {
	ColorEvaluator,
	extractDisplayName,
	extractFilePath,
	FilterEvaluator,
	getFileContext,
	getFolderPath,
	isFolderNote,
} from "@real1ty-obsidian-plugins";
import type { ElementDefinition } from "cytoscape";
import type { App, TFile } from "obsidian";
import type { NexusPropertiesSettings } from "../types/settings";
import { buildRelatedTree, getRelationships, resolveWikiLink, type TreeNode } from "../utils/hierarchy";
import { HierarchyProvider, type HierarchySourceType } from "./hierarchy";
import type { Indexer } from "./indexer";
import type { SettingsStore } from "./settings-store";

interface GraphData {
	nodes: ElementDefinition[];
	edges: ElementDefinition[];
}

interface ConstellationNode {
	center: string; // file path of center node
	orbitals: string[]; // file paths of nodes in orbit
	level: number; // depth in hierarchy (0 = root)
}

interface ConstellationGraphData {
	constellations: ConstellationNode[];
	allNodePaths: Set<string>; // all unique node paths
	edges: ElementDefinition[]; // only center-to-orbital edges
}

interface GraphBuilderOptions {
	sourcePath: string;
	renderRelated: boolean;
	includeAllRelated: boolean;
	startFromCurrent: boolean;
	searchQuery?: string;
	filterEvaluator?: (frontmatter: Record<string, any>) => boolean;
	hierarchySource?: HierarchySourceType;
	mocFilePath?: string;
	parentOverridePath?: string;
}

/**
 * Builds graph data (nodes and edges) from file relationships.
 * Delegates tree construction to HierarchyProvider and utility functions,
 * then converts TreeNode structures to GraphData for rendering.
 */
export class GraphBuilder {
	private readonly filterEvaluator: FilterEvaluator<NexusPropertiesSettings>;
	private readonly colorEvaluator: ColorEvaluator<NexusPropertiesSettings>;
	private allRelatedMaxDepth: number;
	private hierarchyMaxDepth: number;
	private maintainIndirectConnections: boolean;
	private titleProp: string;
	private depthOverride: number | null = null;
	private hierarchySource: HierarchySourceType = "properties";

	constructor(
		private readonly app: App,
		private readonly indexer: Indexer,
		private readonly settingsStore: SettingsStore
	) {
		this.filterEvaluator = new FilterEvaluator(settingsStore.settings$);
		this.colorEvaluator = new ColorEvaluator(settingsStore.settings$);

		const applySettings = (settings: NexusPropertiesSettings) => {
			this.allRelatedMaxDepth = settings.allRelatedMaxDepth;
			this.hierarchyMaxDepth = settings.hierarchyMaxDepth;
			this.maintainIndirectConnections = settings.maintainIndirectConnections;
			this.titleProp = settings.titleProp;
			this.hierarchySource = settings.hierarchySource;
		};
		applySettings(settingsStore.settings$.value);
		settingsStore.settings$.subscribe(applySettings);
	}

	public setHierarchySource(source: HierarchySourceType): void {
		this.hierarchySource = source;
	}

	public setDepthOverride(depth: number | null): void {
		this.depthOverride = depth;
	}

	private getEffectiveAllRelatedMaxDepth(): number {
		return this.depthOverride ?? this.allRelatedMaxDepth;
	}

	private getEffectiveHierarchyMaxDepth(): number {
		return this.depthOverride ?? this.hierarchyMaxDepth;
	}

	/**
	 * Creates a nodeFilter callback that applies the frontmatter property filters.
	 */
	private createNodeFilter(): (frontmatter: Record<string, unknown>) => boolean {
		return (frontmatter) => this.filterEvaluator.evaluateFilters(frontmatter);
	}

	private createNodeElement(pathOrWikiLink: string, level: number, isSource: boolean): ElementDefinition {
		const filePath = extractFilePath(pathOrWikiLink);
		const { frontmatter } = getFileContext(this.app, filePath);
		const titleValue = frontmatter?.[this.titleProp];
		// Title property is a wiki link, extract display name from it
		const displayName = titleValue ? extractDisplayName(String(titleValue)) : extractDisplayName(pathOrWikiLink);

		const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
		const estimatedHeight = 45;
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

	async buildGraph(options: GraphBuilderOptions): Promise<GraphData> {
		let graphData: GraphData;

		const isFolder = isFolderNote(options.sourcePath);

		if (isFolder) {
			if (options.renderRelated) {
				graphData = this.buildFolderRelatedGraphData(options.sourcePath);
			} else {
				graphData = await this.buildFolderHierarchyGraphData(options.sourcePath, options.hierarchySource);
			}
		} else if (options.renderRelated) {
			if (options.includeAllRelated) {
				const constellationData = this.buildRecursiveConstellations(options.sourcePath);
				graphData = this.convertConstellationsToGraphData(constellationData);
			} else {
				graphData = this.buildRelatedGraph(options.sourcePath);
			}
		} else {
			graphData = await this.buildHierarchyGraph(
				options.sourcePath,
				options.startFromCurrent,
				options.hierarchySource,
				options.mocFilePath,
				options.parentOverridePath
			);
		}

		return this.applyGraphFilters(graphData, options.searchQuery, options.filterEvaluator);
	}

	/**
	 * Build a related graph using the shared buildRelatedTree utility.
	 * Single-level: maxDepth=1 ensures only direct related nodes are included.
	 */
	private buildRelatedGraph(sourcePath: string): GraphData {
		const { file } = getFileContext(this.app, sourcePath);
		if (!file) {
			return { nodes: [this.createNodeElement(sourcePath, 0, true)], edges: [] };
		}

		const tree = buildRelatedTree(this.app, this.indexer, file as TFile, {
			maxDepth: 1,
			nodeFilter: this.createNodeFilter(),
		});

		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = new Set<string>();
		this.convertTreeToGraphData(tree, nodes, edges, processedPaths, sourcePath);
		return { nodes, edges };
	}

	/**
	 * Build a hierarchy graph using HierarchyProvider.
	 * Handles both properties and moc-content hierarchy sources transparently.
	 */
	private async buildHierarchyGraph(
		sourcePath: string,
		startFromCurrent: boolean,
		hierarchySource?: HierarchySourceType,
		mocFilePath?: string,
		parentOverridePath?: string,
		sharedProcessedPaths?: Set<string>,
		allowSourceHighlight = true
	): Promise<GraphData> {
		const { file } = getFileContext(this.app, sourcePath);
		if (!file) {
			return { nodes: [], edges: [] };
		}

		const provider = HierarchyProvider.getInstance(this.app, this.indexer, this.settingsStore);
		const effectiveSource = hierarchySource ?? this.hierarchySource;
		const effectiveDepth = this.getEffectiveHierarchyMaxDepth();

		const options = {
			// Only pass maxDepth to tree building when depth override is active (slider).
			// Otherwise, let findTopmostParent use its default (50) and rely on
			// convertTreeToGraphData to enforce the configured depth limit.
			...(this.depthOverride !== null ? { maxDepth: effectiveDepth } : {}),
			highlightPath: sourcePath,
			mocFilePath: effectiveSource === "moc-content" ? mocFilePath || sourcePath : undefined,
			parentOverridePath,
			nodeFilter: this.createNodeFilter(),
		};

		const tFile = file as TFile;
		const tree = startFromCurrent
			? await provider.buildTree(tFile, effectiveSource, options)
			: await provider.buildTreeFromTopParent(tFile, effectiveSource, options);

		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = sharedProcessedPaths ?? new Set<string>();
		const highlightPath = allowSourceHighlight ? sourcePath : undefined;
		this.convertTreeToGraphData(tree, nodes, edges, processedPaths, highlightPath);
		return { nodes, edges };
	}

	/**
	 * Recursively convert a TreeNode to graph nodes and edges.
	 */
	private convertTreeToGraphData(
		treeNode: TreeNode,
		nodes: ElementDefinition[],
		edges: ElementDefinition[],
		processedPaths: Set<string>,
		sourcePath: string | undefined,
		parentPath?: string,
		level = 0
	): void {
		const effectiveDepth = this.getEffectiveHierarchyMaxDepth();
		if (level >= effectiveDepth) return;
		if (processedPaths.has(treeNode.path)) return;

		processedPaths.add(treeNode.path);

		const node = this.createNodeElement(treeNode.path, level, treeNode.path === sourcePath);
		nodes.push(node);

		if (parentPath) {
			edges.push({
				data: { source: parentPath, target: treeNode.path },
			});
		}

		for (const child of treeNode.children) {
			this.convertTreeToGraphData(child, nodes, edges, processedPaths, sourcePath, treeNode.path, level + 1);
		}
	}

	private buildRecursiveConstellations(sourcePath: string): ConstellationGraphData {
		const constellations: ConstellationNode[] = [];
		const allNodePaths = new Set<string>([sourcePath]);
		const edges: ElementDefinition[] = [];
		const nodeFilter = this.createNodeFilter();

		// Queue of constellation centers to process with their level
		const queue: Array<{ centerPath: string; level: number }> = [{ centerPath: sourcePath, level: 0 }];

		while (queue.length > 0) {
			const { centerPath, level } = queue.shift()!;

			// Safety check to prevent infinite loops
			if (level >= this.getEffectiveAllRelatedMaxDepth()) continue;

			const relationships = getRelationships(this.app, this.indexer, centerPath);
			if (!relationships) continue;

			const validOrbitals: Array<{ path: string }> = [];
			for (const wikiLink of relationships.related) {
				const resolvedPath = resolveWikiLink(this.app, wikiLink, centerPath);
				if (!resolvedPath || allNodePaths.has(resolvedPath)) continue;

				const orbitalRels = getRelationships(this.app, this.indexer, resolvedPath);
				if (!orbitalRels) continue;
				if (!nodeFilter(orbitalRels.frontmatter)) continue;

				validOrbitals.push({ path: resolvedPath });
			}

			// Create constellation if there are orbitals
			if (validOrbitals.length > 0 || level === 0) {
				const orbitalPaths = validOrbitals.map((ctx) => ctx.path);

				constellations.push({
					center: centerPath,
					orbitals: orbitalPaths,
					level: level,
				});

				// Add edges from center to each orbital
				orbitalPaths.forEach((orbitalPath) => {
					edges.push({
						data: { source: centerPath, target: orbitalPath },
					});
				});

				// Add orbitals to processed set and queue them for their own constellations
				validOrbitals.forEach((ctx) => {
					allNodePaths.add(ctx.path);
					queue.push({ centerPath: ctx.path, level: level + 1 });
				});
			}
		}

		return { constellations, allNodePaths, edges };
	}

	private convertConstellationsToGraphData(constellationData: ConstellationGraphData): GraphData {
		const nodes: ElementDefinition[] = [];
		const nodeSet = new Set<string>();

		// Track which nodes are centers of their own constellations
		const centerNodeIds = new Set(constellationData.constellations.map((c) => c.center));

		// Track orbital metadata for ALL nodes (first occurrence only)
		const orbitalMetadata = this.collectOrbitalMetadata(constellationData.constellations);

		// Create constellation lookup for O(1) access
		const constellationByCenter = new Map(constellationData.constellations.map((c) => [c.center, c]));

		// Create all nodes with complete metadata
		constellationData.constellations.forEach((constellation, constellationIndex) => {
			// Add center node if not already added
			if (!nodeSet.has(constellation.center)) {
				nodeSet.add(constellation.center);
				const centerNode = this.createNodeElement(constellation.center, constellation.level, constellation.level === 0);
				const asOrbitalOf = orbitalMetadata.get(constellation.center);
				centerNode.data = {
					...centerNode.data,
					constellationIndex,
					isConstellationCenter: true,
					constellationLevel: constellation.level,
					orbitalCount: constellation.orbitals.length,
					...(asOrbitalOf && {
						centerPath: asOrbitalOf.centerPath,
						orbitalIndex: asOrbitalOf.orbitalIndex,
						parentOrbitalCount: asOrbitalOf.orbitalCount,
					}),
				};
				nodes.push(centerNode);
			}

			// Add orbital nodes
			constellation.orbitals.forEach((orbitalPath) => {
				if (!nodeSet.has(orbitalPath)) {
					nodeSet.add(orbitalPath);
					const orbitalNode = this.createNodeElement(orbitalPath, constellation.level + 1, false);
					const orbital = orbitalMetadata.get(orbitalPath)!;
					const isAlsoCenter = centerNodeIds.has(orbitalPath);
					const ownConstellation = constellationByCenter.get(orbitalPath);
					orbitalNode.data = {
						...orbitalNode.data,
						constellationIndex,
						isConstellationCenter: isAlsoCenter,
						constellationLevel: constellation.level + 1,
						centerPath: orbital.centerPath,
						orbitalIndex: orbital.orbitalIndex,
						orbitalCount: orbital.orbitalCount,
						...(isAlsoCenter &&
							ownConstellation && {
								ownOrbitalCount: ownConstellation.orbitals.length,
							}),
					};
					nodes.push(orbitalNode);
				}
			});
		});

		return {
			nodes,
			edges: constellationData.edges,
		};
	}

	private collectOrbitalMetadata(constellations: ConstellationNode[]): Map<
		string,
		{
			centerPath: string;
			orbitalIndex: number;
			orbitalCount: number;
			constellationLevel: number;
		}
	> {
		const metadata = new Map<
			string,
			{
				centerPath: string;
				orbitalIndex: number;
				orbitalCount: number;
				constellationLevel: number;
			}
		>();

		constellations.forEach((constellation) => {
			constellation.orbitals.forEach((orbitalPath, orbitalIndex) => {
				// Only store first occurrence - this is the primary orbital relationship
				if (!metadata.has(orbitalPath)) {
					metadata.set(orbitalPath, {
						centerPath: constellation.center,
						orbitalIndex: orbitalIndex,
						orbitalCount: constellation.orbitals.length,
						constellationLevel: constellation.level,
					});
				}
			});
		});

		return metadata;
	}

	/**
	 * Get all markdown files within a folder (excluding the folder note itself).
	 */
	private getFilesInFolder(folderNotePath: string): string[] {
		const folderPath = getFolderPath(folderNotePath);
		const allFiles = this.app.vault.getMarkdownFiles();

		return allFiles
			.filter((file) => {
				const fileFolderPath = getFolderPath(file.path);
				return (
					file.path !== folderNotePath && // Exclude folder note itself
					(fileFolderPath === folderPath || fileFolderPath.startsWith(`${folderPath}/`))
				);
			})
			.map((file) => file.path);
	}

	/**
	 * Process files in a folder with a callback function.
	 * Handles common logic: filtering, frontmatter checking, and processed path tracking.
	 */
	private processFolderFiles(
		sourcePath: string,
		processedPaths: Set<string>,
		callback: (filePath: string, processedPaths: Set<string>) => void
	): void {
		const filePaths = this.getFilesInFolder(sourcePath);

		filePaths.forEach((filePath) => {
			// Skip if already processed
			if (processedPaths.has(filePath)) return;

			// Check if file has frontmatter and passes filters
			const { file, frontmatter } = getFileContext(this.app, filePath);
			if (!file || !frontmatter) return;
			if (!this.filterEvaluator.evaluateFilters(frontmatter)) return;
			callback(filePath, processedPaths);
		});
	}

	private buildFolderRelatedGraphData(sourcePath: string): GraphData {
		const allNodes: ElementDefinition[] = [];
		const allEdges: ElementDefinition[] = [];
		const processedPaths = new Set<string>();
		let constellationGroupIndex = 0;

		this.processFolderFiles(sourcePath, processedPaths, (filePath, paths) => {
			const constellationData = this.buildRecursiveConstellations(filePath);
			const graphData = this.convertConstellationsToGraphData(constellationData);

			// Mark all nodes in this constellation as processed
			constellationData.allNodePaths.forEach((path) => {
				paths.add(path);
			});

			// Add constellation group metadata to all nodes in this group
			const groupedNodes = graphData.nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					constellationGroup: constellationGroupIndex,
				},
			}));

			allNodes.push(...groupedNodes);
			allEdges.push(...graphData.edges);
			constellationGroupIndex++;
		});

		return { nodes: allNodes, edges: allEdges };
	}

	private async buildFolderHierarchyGraphData(
		sourcePath: string,
		hierarchySource?: HierarchySourceType
	): Promise<GraphData> {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = new Set<string>();

		const filePaths = this.getFilesInFolder(sourcePath);

		for (const filePath of filePaths) {
			if (processedPaths.has(filePath)) continue;

			const { file, frontmatter } = getFileContext(this.app, filePath);
			if (!file || !frontmatter) continue;
			if (!this.filterEvaluator.evaluateFilters(frontmatter)) continue;

			const treeData = await this.buildHierarchyGraph(
				filePath,
				false,
				hierarchySource,
				undefined,
				undefined,
				processedPaths,
				false
			);
			nodes.push(...treeData.nodes);
			edges.push(...treeData.edges);
		}

		return { nodes, edges };
	}

	private applyGraphFilters(
		graphData: GraphData,
		searchQuery?: string,
		filterEvaluator?: (frontmatter: Record<string, any>) => boolean
	): GraphData {
		// Apply both search and expression filters here - frontmatter property filters are applied during graph building
		if (!searchQuery && !filterEvaluator) return graphData;

		const filteredNodes = graphData.nodes.filter((node) => {
			const { isSource, label, id } = node.data || {};

			// Always keep source node
			if (isSource) return true;

			// Apply search filter
			if (searchQuery) {
				const nodeName = (label as string).toLowerCase();
				if (!nodeName.includes(searchQuery.toLowerCase())) {
					return false;
				}
			}

			// Apply expression filter on frontmatter
			if (filterEvaluator) {
				const { frontmatter } = getFileContext(this.app, id as string);
				if (!frontmatter || !filterEvaluator(frontmatter)) {
					return false;
				}
			}

			return true;
		});

		const keepNodeIds = new Set(filteredNodes.map((node) => node.data?.id as string));

		let filteredEdges = graphData.edges.filter(
			(edge) => keepNodeIds.has(edge.data?.source as string) && keepNodeIds.has(edge.data?.target as string)
		);

		if (this.maintainIndirectConnections) {
			const indirectEdges = this.findIndirectConnections(graphData.edges, keepNodeIds);
			filteredEdges = [...filteredEdges, ...indirectEdges];
		}

		return { nodes: filteredNodes, edges: filteredEdges };
	}

	private findIndirectConnections(originalEdges: ElementDefinition[], keepNodeIds: Set<string>): ElementDefinition[] {
		const outgoing = new Map<string, Set<string>>();
		for (const edge of originalEdges) {
			const source = edge.data?.source as string | undefined;
			const target = edge.data?.target as string | undefined;
			if (!source || !target) continue;

			let set = outgoing.get(source);
			if (!set) {
				set = new Set<string>();
				outgoing.set(source, set);
			}
			set.add(target);
		}

		// Nodes that appear in the graph
		const allNodeIds = new Set<string>();
		for (const [source, targets] of outgoing) {
			allNodeIds.add(source);
			for (const target of targets) {
				allNodeIds.add(target);
			}
		}

		const removedNodeIds = new Set<string>();
		for (const id of allNodeIds) {
			if (!keepNodeIds.has(id)) {
				removedNodeIds.add(id);
			}
		}

		const indirect = new Map<string, Set<string>>();

		const addIndirect = (from: string, to: string) => {
			if (from === to) return;

			// If there is already a direct edge, skip
			if (outgoing.get(from)?.has(to)) return;

			let set = indirect.get(from);
			if (!set) {
				set = new Set<string>();
				indirect.set(from, set);
			}
			set.add(to);
		};

		// For each kept node, BFS through removed nodes only. Emit an indirect edge when we reach another kept node.
		for (const start of keepNodeIds) {
			const visitedRemoved = new Set<string>();
			const queue: string[] = [];

			const first = outgoing.get(start);
			if (!first) continue;

			for (const next of first) {
				if (keepNodeIds.has(next)) continue;
				if (removedNodeIds.has(next) && !visitedRemoved.has(next)) {
					visitedRemoved.add(next);
					queue.push(next);
				}
			}

			while (queue.length > 0) {
				const cur = queue.shift();
				if (!cur) break;

				const neighbors = outgoing.get(cur);
				if (!neighbors) continue;

				for (const next of neighbors) {
					if (keepNodeIds.has(next)) {
						addIndirect(start, next);
						continue;
					}

					if (removedNodeIds.has(next) && !visitedRemoved.has(next)) {
						visitedRemoved.add(next);
						queue.push(next);
					}
				}
			}
		}

		const result: ElementDefinition[] = [];
		for (const [source, targets] of indirect) {
			for (const target of targets) {
				result.push({ data: { source, target, indirect: true } });
			}
		}
		return result;
	}
}
