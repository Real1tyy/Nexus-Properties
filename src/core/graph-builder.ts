import type { ElementDefinition } from "cytoscape";
import type { App } from "obsidian";
import { ColorEvaluator } from "../utils/colors";
import { extractDisplayName, extractFilePath, type FileContext, getFileContext } from "../utils/file";
import { FilterEvaluator } from "../utils/filters";
import type { Indexer } from "./indexer";
import type { SettingsStore } from "./settings-store";

export interface GraphData {
	nodes: ElementDefinition[];
	edges: ElementDefinition[];
}

export interface ConstellationNode {
	center: string; // file path of center node
	orbitals: string[]; // file paths of nodes in orbit
	level: number; // depth in hierarchy (0 = root)
}

export interface ConstellationGraphData {
	constellations: ConstellationNode[];
	allNodePaths: Set<string>; // all unique node paths
	edges: ElementDefinition[]; // only center-to-orbital edges
}

export interface GraphBuilderOptions {
	sourcePath: string;
	renderRelated: boolean;
	includeAllRelated: boolean;
	startFromCurrent: boolean;
	searchQuery?: string;
}

interface ValidFileContext extends FileContext {
	wikiLink: string;
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
				const fileContext = getFileContext(this.app, path);
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
			if (options.includeAllRelated) {
				const constellationData = this.buildRecursiveConstellations(options.sourcePath);
				graphData = this.convertConstellationsToGraphData(constellationData);
			} else {
				graphData = this.buildRelatedGraphData(options.sourcePath);
			}
		} else {
			graphData = this.buildHierarchyGraphData(options.sourcePath, options.startFromCurrent);
		}

		return this.applyGraphFilters(graphData, options.searchQuery);
	}

	private buildRelatedGraphData(sourcePath: string): GraphData {
		const processedPaths = new Set<string>([sourcePath]);
		const sourceNode = this.createNodeElement(sourcePath, 0, true);

		const { file, frontmatter } = getFileContext(this.app, sourcePath);
		if (!file || !frontmatter) {
			return { nodes: [sourceNode], edges: [] };
		}

		const relations = this.indexer.extractRelationships(file, frontmatter);

		const validContexts = this.resolveValidContexts(relations.related, processedPaths);

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

	private buildRecursiveConstellations(sourcePath: string): ConstellationGraphData {
		const constellations: ConstellationNode[] = [];
		const allNodePaths = new Set<string>([sourcePath]);
		const edges: ElementDefinition[] = [];

		// Queue of constellation centers to process with their level
		const queue: Array<{ centerPath: string; level: number }> = [{ centerPath: sourcePath, level: 0 }];

		while (queue.length > 0) {
			const { centerPath, level } = queue.shift()!;

			// Safety check to prevent infinite loops
			if (level > 10) continue;

			const { file, frontmatter } = getFileContext(this.app, centerPath);
			if (!file || !frontmatter) continue;

			const relations = this.indexer.extractRelationships(file, frontmatter);
			const validOrbitals = this.resolveValidContexts(relations.related, allNodePaths);

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

	private collectOrbitalMetadata(
		constellations: ConstellationNode[]
	): Map<string, { centerPath: string; orbitalIndex: number; orbitalCount: number; constellationLevel: number }> {
		const metadata = new Map<
			string,
			{ centerPath: string; orbitalIndex: number; orbitalCount: number; constellationLevel: number }
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

	private applyGraphFilters(graphData: GraphData, searchQuery?: string): GraphData {
		// Only apply search filter here - frontmatter filters are applied during graph building
		if (!searchQuery) return graphData;

		const filteredNodes = graphData.nodes.filter((node) => {
			const { isSource, label } = node.data || {};

			// Always keep source node
			if (isSource) return true;

			const nodeName = (label as string).toLowerCase();
			return nodeName.includes(searchQuery.toLowerCase());
		});

		const keepNodeIds = new Set(filteredNodes.map((node) => node.data?.id as string));

		const filteredEdges = graphData.edges.filter(
			(edge) => keepNodeIds.has(edge.data?.source as string) && keepNodeIds.has(edge.data?.target as string)
		);

		return { nodes: filteredNodes, edges: filteredEdges };
	}
}
