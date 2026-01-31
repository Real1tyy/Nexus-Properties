import {
	ColorEvaluator,
	extractDisplayName,
	extractFilePath,
	type FileContext,
	FilterEvaluator,
	getFileContext,
	getFolderPath,
	isFolderNote,
} from "@real1ty-obsidian-plugins";
import type { ElementDefinition } from "cytoscape";
import type { App } from "obsidian";
import type { NexusPropertiesSettings } from "../types/settings";
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
}

interface ValidFileContext extends FileContext {
	wikiLink: string;
}

/**
 * Builds graph data (nodes and edges) from file relationships.
 * Handles both hierarchy and constellation view modes.
 */
export class GraphBuilder {
	private readonly filterEvaluator: FilterEvaluator<NexusPropertiesSettings>;
	private readonly colorEvaluator: ColorEvaluator<NexusPropertiesSettings>;
	private allRelatedMaxDepth: number;
	private hierarchyMaxDepth: number;
	private maintainIndirectConnections: boolean;
	private prioritizeParentProp: string;
	private titleProp: string;
	private depthOverride: number | null = null;

	constructor(
		private readonly app: App,
		private readonly indexer: Indexer,
		settingsStore: SettingsStore
	) {
		this.filterEvaluator = new FilterEvaluator(settingsStore.settings$);
		this.colorEvaluator = new ColorEvaluator(settingsStore.settings$);

		const applySettings = (settings: NexusPropertiesSettings) => {
			this.allRelatedMaxDepth = settings.allRelatedMaxDepth;
			this.hierarchyMaxDepth = settings.hierarchyMaxDepth;
			this.maintainIndirectConnections = settings.maintainIndirectConnections;
			this.prioritizeParentProp = settings.prioritizeParentProp;
			this.titleProp = settings.titleProp;
		};
		applySettings(settingsStore.settings$.value);
		settingsStore.settings$.subscribe(applySettings);
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
	 * Get the prioritized parent for a given node, if configured and valid.
	 * Returns the path of the prioritized parent if it exists in the node's parent list, otherwise undefined.
	 */
	private getPrioritizedParent(
		frontmatter: Record<string, unknown>,
		validParents: ValidFileContext[]
	): string | undefined {
		if (!this.prioritizeParentProp || !frontmatter[this.prioritizeParentProp]) {
			return undefined;
		}

		const prioritizedParentValue = String(frontmatter[this.prioritizeParentProp]).trim();

		const prioritizedPath = extractFilePath(prioritizedParentValue);

		const matchingParent = validParents.find((ctx) => {
			const parentPath = extractFilePath(ctx.wikiLink);

			return parentPath === prioritizedPath || ctx.path === prioritizedPath;
		});

		return matchingParent?.path;
	}

	private resolveValidContexts(wikiLinks: string[], excludePaths: Set<string>, sourcePath: string): ValidFileContext[] {
		return wikiLinks
			.map((wikiLink) => {
				const linkPath = extractFilePath(wikiLink);
				const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);

				if (!resolvedFile) {
					return {
						wikiLink,
						file: null,
						frontmatter: null,
						path: "",
						pathWithExt: "",
					};
				}

				const fileContext = getFileContext(this.app, resolvedFile.path);
				return { wikiLink, ...fileContext };
			})
			.filter((ctx): ctx is ValidFileContext => {
				if (ctx.file === null || !ctx.frontmatter || excludePaths.has(ctx.path)) {
					return false;
				}
				return this.filterEvaluator.evaluateFilters(ctx.frontmatter);
			});
	}

	private createNodeElement(pathOrWikiLink: string, level: number, isSource: boolean): ElementDefinition {
		const filePath = extractFilePath(pathOrWikiLink);
		const { frontmatter } = getFileContext(this.app, filePath);
		const displayName = String(frontmatter?.[this.titleProp] ?? extractDisplayName(pathOrWikiLink));

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

	buildGraph(options: GraphBuilderOptions): GraphData {
		let graphData: GraphData;

		const isFolder = isFolderNote(options.sourcePath);

		if (isFolder) {
			if (options.renderRelated) {
				graphData = this.buildFolderRelatedGraphData(options.sourcePath);
			} else {
				graphData = this.buildFolderHierarchyGraphData(options.sourcePath);
			}
		} else if (options.renderRelated) {
			if (options.includeAllRelated) {
				const constellationData = this.buildRecursiveConstellations(options.sourcePath);
				graphData = this.convertConstellationsToGraphData(constellationData);
			} else {
				graphData = this.buildRelatedGraphData(options.sourcePath);
			}
		} else {
			graphData = this.buildHierarchyGraphData(options.sourcePath, options.startFromCurrent);
		}

		return this.applyGraphFilters(graphData, options.searchQuery, options.filterEvaluator);
	}

	private buildRelatedGraphData(sourcePath: string): GraphData {
		const processedPaths = new Set<string>([sourcePath]);
		const sourceNode = this.createNodeElement(sourcePath, 0, true);

		const { file, frontmatter } = getFileContext(this.app, sourcePath);
		if (!file || !frontmatter) {
			return { nodes: [sourceNode], edges: [] };
		}

		const relations = this.indexer.extractRelationships(file, frontmatter);

		const validContexts = this.resolveValidContexts(relations.related, processedPaths, sourcePath);

		const relatedNodes = validContexts.map((ctx) => this.createNodeElement(ctx.pathWithExt, 1, false));

		const edges = validContexts.map((ctx) => ({
			data: { source: sourcePath, target: ctx.path },
		}));

		return {
			nodes: [sourceNode, ...relatedNodes],
			edges,
		};
	}

	private buildHierarchyGraphData(
		sourcePath: string,
		startFromCurrent: boolean,
		sharedProcessedPaths?: Set<string>,
		allowSourceHighlight = true
	): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = sharedProcessedPaths || new Set<string>();

		const effectiveDepth = this.getEffectiveHierarchyMaxDepth();
		const rootPath = startFromCurrent
			? sourcePath
			: this.depthOverride !== null
				? this.findTopmostParent(sourcePath, effectiveDepth)
				: this.findTopmostParent(sourcePath);

		const rootNode = this.createNodeElement(rootPath, 0, allowSourceHighlight && rootPath === sourcePath);
		nodes.push(rootNode);
		processedPaths.add(rootPath);

		const queue: Array<{ path: string; level: number }> = [{ path: rootPath, level: 0 }];

		while (queue.length > 0) {
			const { path: currentPath, level: currentLevel } = queue.shift()!;

			const { file, frontmatter } = getFileContext(this.app, currentPath);
			if (!file || !frontmatter) continue;

			// Check if we can add children (next level must be within depth limit)
			if (currentLevel + 1 >= effectiveDepth) continue;

			const relations = this.indexer.extractRelationships(file, frontmatter);
			const validChildren = this.resolveValidContexts(relations.children, processedPaths, currentPath);

			const childNodes = validChildren.map((ctx) =>
				this.createNodeElement(ctx.pathWithExt, currentLevel + 1, allowSourceHighlight && ctx.path === sourcePath)
			);

			const childEdges = validChildren.map((ctx) => ({
				data: { source: currentPath, target: ctx.path },
			}));

			nodes.push(...childNodes);
			edges.push(...childEdges);

			validChildren.forEach((ctx) => {
				processedPaths.add(ctx.path);
				queue.push({ path: ctx.path, level: currentLevel + 1 });
			});
		}

		return { nodes, edges };
	}

	private findTopmostParent(startPath: string, maxDepth: number = 50): string {
		const visited = new Set<string>();
		let topmostParent = startPath;
		let maxLevel = 0;

		const dfsUpwards = (filePath: string, currentLevel: number): void => {
			if (currentLevel >= maxDepth || visited.has(filePath)) return;
			visited.add(filePath);

			if (currentLevel > maxLevel) {
				maxLevel = currentLevel;
				topmostParent = filePath;
			}

			const { file, frontmatter } = getFileContext(this.app, filePath);
			if (!file || !frontmatter) return;

			const relations = this.indexer.extractRelationships(file, frontmatter);
			const validParents = this.resolveValidContexts(relations.parent, visited, filePath);

			// Check if this node has a prioritized parent
			const prioritizedParentPath = this.getPrioritizedParent(frontmatter, validParents);
			if (prioritizedParentPath) {
				dfsUpwards(prioritizedParentPath, currentLevel + 1);
				return;
			}

			// Otherwise, explore all parents (first come first serve)
			for (const ctx of validParents) {
				dfsUpwards(ctx.path, currentLevel + 1);
			}
		};

		dfsUpwards(startPath, 0);
		return topmostParent;
	}

	private buildRecursiveConstellations(sourcePath: string): ConstellationGraphData {
		const constellations: ConstellationNode[] = [];
		const allNodePaths = new Set<string>([sourcePath]);
		const edges: ElementDefinition[] = [];

		// Queue of constellation centers to process with their level
		const queue: Array<{ centerPath: string; level: number }> = [{ centerPath: sourcePath, level: 0 }];

		while (queue.length > 0) {
			const { centerPath, level } = queue.shift()!;

			// Safety check to prevent infinite loops
			if (level >= this.getEffectiveAllRelatedMaxDepth()) continue;

			const { file, frontmatter } = getFileContext(this.app, centerPath);
			if (!file || !frontmatter) continue;

			const relations = this.indexer.extractRelationships(file, frontmatter);
			const validOrbitals = this.resolveValidContexts(relations.related, allNodePaths, centerPath);

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

	private buildFolderHierarchyGraphData(sourcePath: string): GraphData {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedPaths = new Set<string>();

		this.processFolderFiles(sourcePath, processedPaths, (filePath, paths) => {
			// For folder notes, don't highlight any node as source (all nodes equal)
			const treeData = this.buildHierarchyGraphData(filePath, false, paths, false);
			nodes.push(...treeData.nodes);
			edges.push(...treeData.edges);
		});

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
