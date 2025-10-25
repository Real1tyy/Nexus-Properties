import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { ItemView, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import { GraphBuilder } from "../core/graph-builder";
import type { Indexer } from "../core/indexer";
import type NexusPropertiesPlugin from "../main";
import { isFolderNote } from "../utils/file";
import { GraphHeader } from "./graph-header";
import { GraphInteractionHandler } from "./graph-interaction-handler";
import { GraphSearch } from "./graph-search";
import { GraphZoomManager } from "./graph-zoom-manager";
import { GraphZoomPreview } from "./graph-zoom-preview";
import { CollisionDetector } from "./layout/collision-detector";
import { ConstellationPositioner } from "./layout/constellation-positioner";
import { NodeOrganizer } from "./layout/node-organizer";
import { NodeContextMenu } from "./node-context-menu";
import { PropertyTooltip } from "./property-tooltip";

cytoscape.use(cytoscapeDagre);

export const VIEW_TYPE_RELATIONSHIP_GRAPH = "nexus-relationship-graph-view";

export class RelationshipGraphView extends ItemView {
	private cy: Core | null = null;
	private graphContainerEl: HTMLElement | null = null;
	private previewWrapperEl: HTMLElement | null = null;
	private header: GraphHeader | null = null;
	private currentFile: TFile | null = null;
	private ignoreTopmostParent = false;
	private renderRelated = false;
	private includeAllRelated = false;
	private contextMenu: NodeContextMenu;
	private resizeObserver: ResizeObserver | null = null;
	private resizeDebounceTimer: number | null = null;
	private isEnlarged = false;
	private originalWidth: number | null = null;
	private isUpdating = false;
	private graphBuilder: GraphBuilder;
	private settingsSubscription: Subscription | null = null;
	private propertyTooltip: PropertyTooltip;
	private graphSearch: GraphSearch | null = null;
	private searchQuery = "";
	private zoomManager: GraphZoomManager;
	private interactionHandler: GraphInteractionHandler;
	private nodeOrganizer: NodeOrganizer;

	constructor(
		leaf: any,
		private readonly indexer: Indexer,
		private readonly plugin: NexusPropertiesPlugin
	) {
		super(leaf);
		this.contextMenu = new NodeContextMenu(this.app, this.plugin.settingsStore);
		this.graphBuilder = new GraphBuilder(this.app, this.indexer, this.plugin.settingsStore);
		this.nodeOrganizer = new NodeOrganizer();

		// Initialize zoom manager with lazy getters
		this.zoomManager = new GraphZoomManager(this.app, {
			getCy: () => {
				if (!this.cy) throw new Error("Cytoscape not yet initialized");
				return this.cy;
			},
			getPreviewWrapperEl: () => {
				if (!this.previewWrapperEl) throw new Error("Preview wrapper not yet initialized");
				return this.previewWrapperEl;
			},
			settingsStore: this.plugin.settingsStore,
			onToggleStatesChange: () => {
				// States are tracked by zoomManager
			},
		});

		// Initialize property tooltip
		this.propertyTooltip = new PropertyTooltip(this.app, {
			settingsStore: this.plugin.settingsStore,
			onFileOpen: (linkPath, event) => this.openFile(linkPath, event),
			isZoomMode: () => this.zoomManager.isInZoomMode(),
		});

		// Initialize interaction handler
		this.interactionHandler = new GraphInteractionHandler(this.app, this.propertyTooltip, this.contextMenu, {
			getCy: () => {
				if (!this.cy) throw new Error("Cytoscape not yet initialized");
				return this.cy;
			},
			viewType: VIEW_TYPE_RELATIONSHIP_GRAPH,
			getCurrentFile: () => this.currentFile,
			getGraphContainerEl: () => this.graphContainerEl,
			onNodeClick: (filePath, _event) => {
				if (this.zoomManager.isInZoomMode()) {
					this.focusOnNode(filePath);
				} else {
					this.enterZoomMode(filePath);
				}
			},
			onEdgeClick: (nodeToFocus, _sourceId) => {
				this.focusOnNode(nodeToFocus);
			},
			isZoomMode: () => this.zoomManager.isInZoomMode(),
			focusedNodeId: () => this.zoomManager.getFocusedNodeId(),
			isUpdating: () => this.isUpdating,
		});
	}

	getViewType(): string {
		return VIEW_TYPE_RELATIONSHIP_GRAPH;
	}

	getDisplayText(): string {
		return "Relationship Graph";
	}

	getIcon(): string {
		return "git-fork";
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("nexus-graph-view-content");

		this.header = new GraphHeader(contentEl, {
			currentFileName: "No file selected",
			renderRelated: this.renderRelated,
			includeAllRelated: this.includeAllRelated,
			startFromCurrent: this.ignoreTopmostParent,
			isFolderNote: false,
			onRenderRelatedChange: (value) => {
				this.renderRelated = value;
				this.updateGraph();
			},
			onIncludeAllRelatedChange: (value) => {
				this.includeAllRelated = value;
				this.updateGraph();
			},
			onStartFromCurrentChange: (value) => {
				this.ignoreTopmostParent = value;
				this.updateGraph();
			},
		});

		// Create search component (sits between header and preview)
		this.graphSearch = new GraphSearch(contentEl, {
			onSearchChange: (query) => {
				this.searchQuery = query;
				this.updateGraph();
			},
			onClose: () => {
				this.searchQuery = "";
			},
		});

		// Create a wrapper for zoom preview (sits between header and graph)
		// This container will hold the zoom preview when active
		this.previewWrapperEl = contentEl.createEl("div", {
			cls: "nexus-graph-zoom-preview-wrapper",
		});

		// Create graph container
		this.graphContainerEl = contentEl.createEl("div", {
			cls: "nexus-graph-view-container",
		});

		// Register event listener for active file changes
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				this.onFileOpen(file);
			})
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				// Only re-render if the changed file is the currently displayed file
				if (this.currentFile && file.path === this.currentFile.path) {
					this.updateGraph();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (this.currentFile && oldPath === this.currentFile.path && file instanceof TFile) {
					this.currentFile = file;
					this.updateGraph();
				}
			})
		);

		setTimeout(() => {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) {
				this.onFileOpen(activeFile);
			}
		}, 100);

		// Set up resize observer with debouncing
		this.setupResizeObserver();

		// Also react to global window resizes
		this.registerDomEvent(window, "resize", () => {
			this.handleResize();
		});

		// Register ESC key to exit zoom mode or hide search
		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Escape") {
				if (this.graphSearch?.isVisible()) {
					evt.preventDefault();
					this.graphSearch.hide();
				} else if (this.zoomManager.isInZoomMode()) {
					evt.preventDefault();
					this.exitZoomMode();
				}
			}
		});

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe(() => {
			if (this.currentFile && !this.isUpdating) {
				this.updateGraph();
			}
		});

		// When this view becomes the active leaf, ensure the graph is centered
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf === this.leaf && this.cy && !this.isUpdating) {
					this.ensureCentered();
				}
			})
		);
	}

	private setupResizeObserver(): void {
		if (!this.graphContainerEl) return;

		this.resizeObserver = new ResizeObserver(() => {
			// Clear previous timer
			if (this.resizeDebounceTimer !== null) {
				window.clearTimeout(this.resizeDebounceTimer);
			}

			// Set new timer to re-render after 1 second of no resize
			this.resizeDebounceTimer = window.setTimeout(() => {
				this.handleResize();
			}, 100);
		});

		this.resizeObserver.observe(this.graphContainerEl);
	}

	private handleResize(): void {
		if (!this.cy) return;

		const skipFitOnce = this.zoomManager.shouldSuppressNextResizeFit();

		// Always notify cytoscape of size changes
		this.cy.resize();

		// Re-fit and re-center the graph using the shared helper (unless suppressed)
		if (!skipFitOnce) {
			this.ensureCentered();
		}
	}

	async onClose(): Promise<void> {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		if (this.resizeDebounceTimer !== null) {
			window.clearTimeout(this.resizeDebounceTimer);
			this.resizeDebounceTimer = null;
		}

		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		if (this.zoomManager) {
			this.zoomManager.cleanup();
		}

		if (this.propertyTooltip) {
			this.propertyTooltip.destroy();
		}

		if (this.graphSearch) {
			this.graphSearch.destroy();
			this.graphSearch = null;
		}

		this.destroyGraph();

		if (this.header) {
			this.header.destroy();
			this.header = null;
		}

		this.currentFile = null;
		this.graphContainerEl = null;
		this.previewWrapperEl = null;
	}

	toggleEnlargement(): void {
		// Find the current view's leaf
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATIONSHIP_GRAPH);
		if (leaves.length === 0) return;

		// Access the DOM element through the view's content element
		const viewContainerEl = this.contentEl.closest(".workspace-leaf");
		if (!viewContainerEl) return;

		const splitContainer = viewContainerEl.closest(".workspace-split.mod-left-split, .workspace-split.mod-right-split");
		if (!splitContainer || !(splitContainer instanceof HTMLElement)) return;

		if (this.isEnlarged) {
			// Restore original width
			if (this.originalWidth !== null) {
				splitContainer.style.width = `${this.originalWidth}px`;
			}
			this.isEnlarged = false;
			this.originalWidth = null;
		} else {
			// Store original width and enlarge
			this.originalWidth = splitContainer.clientWidth;

			const settings = this.plugin.settingsStore.settings$.value;
			const windowWidth = window.innerWidth;
			const targetWidth = (windowWidth * settings.graphEnlargedWidthPercent) / 100;

			splitContainer.style.width = `${targetWidth}px`;
			this.isEnlarged = true;
		}

		// Trigger a resize event to update the graph
		window.dispatchEvent(new Event("resize"));
		// Additionally refresh viewport immediately to avoid missed events
		this.handleResize();
	}

	toggleSearch(): void {
		if (!this.graphSearch) return;

		if (this.graphSearch.isVisible()) {
			this.graphSearch.hide();
		} else {
			this.graphSearch.show();
		}
	}

	private onFileOpen(file: TFile | null): void {
		if (!file) {
			this.showEmptyState("No file selected");
			return;
		}

		if (!this.indexer) {
			this.showEmptyState("Plugin is still initializing. Please wait...");
			return;
		}

		if (!this.indexer.shouldIndexFile(file.path)) {
			this.showEmptyState("This file is not in a configured directory for relationship tracking.");
			return;
		}

		const { frontmatter } = this.app.metadataCache.getFileCache(file) ?? {};

		if (!frontmatter && !isFolderNote(file.path)) {
			this.showEmptyState("This file has no frontmatter properties.");
			return;
		}

		// Exit zoom mode when switching to a different file
		if (this.zoomManager.isInZoomMode() && this.currentFile && file.path !== this.currentFile.path) {
			this.exitZoomMode();
		}

		this.currentFile = file;
		this.updateGraph();
	}

	private showEmptyState(message: string): void {
		this.currentFile = null;
		this.destroyGraph();

		if (this.header) {
			this.header.update({ currentFileName: message });
		}

		if (this.graphContainerEl) {
			this.graphContainerEl.empty();
			this.graphContainerEl.createEl("div", {
				text: message,
				cls: "nexus-graph-empty-state",
			});
		}
	}

	private updateGraph(): void {
		if (!this.currentFile || this.isUpdating) return;

		this.isUpdating = true;

		try {
			const isFolder = isFolderNote(this.currentFile.path);
			if (this.header) {
				this.header.update({
					currentFileName: this.currentFile.basename,
					isFolderNote: isFolder,
				});
			}

			const { nodes, edges } = this.graphBuilder.buildGraph({
				sourcePath: this.currentFile.path,
				renderRelated: this.renderRelated,
				includeAllRelated: this.includeAllRelated,
				startFromCurrent: this.ignoreTopmostParent,
				searchQuery: this.searchQuery,
			});

			this.destroyGraph();

			if (this.graphContainerEl) {
				this.graphContainerEl.empty();
			}

			this.initializeCytoscape();
			this.renderGraph(nodes, edges);
			// Ensure viewport aligns with container right after initial render
			if (this.cy) {
				this.cy.resize();
				this.cy.fit();
				this.cy.center();
			}
		} finally {
			this.isUpdating = false;
		}
	}

	private destroyGraph(): void {
		if (this.cy) {
			// Stop all ongoing animations before destroying
			this.cy.stop();
			// Remove all event handlers
			this.cy.removeAllListeners();
			this.cy.destroy();
			this.cy = null;
		}
	}

	private initializeCytoscape(): void {
		// Ensure container is valid and attached to DOM
		if (!this.graphContainerEl || !this.graphContainerEl.isConnected) {
			console.error("Cannot initialize Cytoscape: container is not attached to DOM");
			return;
		}

		this.cy = cytoscape({
			container: this.graphContainerEl,
			minZoom: 0.3,
			maxZoom: 3,
			style: [
				// Base constellation "star" nodes
				{
					selector: "node",
					style: {
						width: 16,
						height: 16,
						"background-color": "data(nodeColor)",
						"border-width": 2,
						"border-color": "#ffffff",
						"border-opacity": 0.8,
						shape: "ellipse",
						label: "data(label)",
						"font-size": 11,
						color: "#d4e4ff",
						"text-margin-y": -18,
						"text-outline-color": "#000",
						"text-outline-width": 2.5,
						"text-halign": "center",
						"text-valign": "top",
						"text-wrap": "wrap",
						"text-max-width": "140px",
						"text-justification": "center",
						"line-height": 1.4,
						"overlay-color": "#7ad1ff",
						"overlay-opacity": 0.15,
						"overlay-padding": 12,
						"transition-property": "overlay-opacity, overlay-padding, width, height, background-color",
						"transition-duration": 300,
						"transition-timing-function": "ease-out",
					},
				},
				// Source node (central star) - larger and brighter
				{
					selector: "node[?isSource]",
					style: {
						width: 24,
						height: 24,
						"border-color": "#fff",
						"border-width": 3,
						"font-weight": "bold",
						"font-size": 13,
						color: "#ffeaa7",
						"text-max-width": "160px",
						"overlay-opacity": 0.35,
						"overlay-padding": 20,
					},
				},
				// Root/parent nodes - medium importance
				{
					selector: "node[level = 0]",
					style: {
						width: 20,
						height: 20,
						"overlay-padding": 16,
					},
				},
				// Focused node in zoom mode - same size as source node but keep text style
				// This comes after level-based styles to ensure it takes priority
				{
					selector: "node.focused",
					style: {
						width: 24,
						height: 24,
						"border-color": "#fff",
						"border-width": 3,
						"overlay-opacity": 0.35,
						"overlay-padding": 20,
					},
				},
				// Glow effect for special nodes
				{
					selector: "node.glow",
					style: {
						"overlay-opacity": 0.28,
					},
				},
				// Dimmed nodes (during hover)
				{
					selector: "node.dim",
					style: {
						opacity: 0.25,
					},
				},
				// Edge glow underlay (wide, translucent)
				{
					selector: "edge",
					style: {
						width: 4,
						"line-color": "rgba(120, 180, 255, 0.12)",
						"curve-style": "unbundled-bezier",
						"control-point-distances": [30, -30],
						"control-point-weights": [0.3, 0.7],
						"target-arrow-shape": "none",
						opacity: 0.8,
					},
				},
				// Edge core line (thin, bright)
				{
					selector: "edge.core",
					style: {
						width: 1.5,
						"line-color": "#a7c8ff",
						opacity: 0.9,
					},
				},
				// Highlighted path
				{
					selector: "edge.highlighted",
					style: {
						width: 2.5,
						"line-color": "#ffffff",
						opacity: 1,
						"transition-property": "line-color, width, opacity",
						"transition-duration": 250,
					},
				},
				// Dimmed edges
				{
					selector: "edge.dim",
					style: {
						opacity: 0.15,
					},
				},
			],
			layout: {
				name: "grid",
			},
		});

		// Add all edges to core class for layered rendering
		this.cy.edges().addClass("core");

		this.interactionHandler.setupInteractions();
	}

	private renderGraph(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
		if (!this.cy) return;

		this.cy.add([...nodes, ...edges]);

		const settings = this.plugin.settingsStore.settings$.value;
		const animationDuration = settings.graphAnimationDuration;

		const isFolderNoteGraph = this.currentFile && isFolderNote(this.currentFile.path);

		// Check if nodes have constellation metadata (recursive constellation mode)
		const hasConstellationData = nodes.some((node) => node.data && typeof node.data.constellationIndex === "number");

		// Check if nodes have constellation group metadata (folder related mode)
		const hasConstellationGroups = nodes.some((node) => node.data && typeof node.data.constellationGroup === "number");

		if (isFolderNoteGraph && this.renderRelated && hasConstellationGroups) {
			// Apply constellation layout for folder related mode
			this.applyFolderConstellationLayout(nodes, edges, animationDuration);
		} else if (isFolderNoteGraph) {
			// Apply dagre first, then redistribute trees vertically
			this.applyForestLayoutWithVerticalDistribution(nodes, edges, animationDuration);
		} else if (this.renderRelated && this.includeAllRelated && hasConstellationData) {
			// Use manual positioning for recursive constellations
			this.applyRecursiveConstellationLayout(nodes, animationDuration);
		} else if (this.renderRelated) {
			// Use concentric layout for simple constellation/nebula pattern
			// Central star (source) in the middle, related nodes in outer orbit
			this.runLayoutWithAnimationHandling(
				() =>
					this.cy!.layout({
						name: "concentric",
						fit: true,
						padding: 120,
						startAngle: (3 / 2) * Math.PI, // Start at top
						sweep: undefined, // Full circle
						clockwise: true,
						equidistant: true,
						minNodeSpacing: 100, // Prevent overlapping
						concentric: (node: any) => {
							// Source node gets highest concentric value (innermost)
							return node.data("isSource") ? 2 : 1;
						},
						levelWidth: () => {
							// All non-source nodes at same level
							return 1;
						},
						animate: animationDuration > 0,
						animationDuration: animationDuration,
						animationEasing: "ease-out-cubic",
					}),
				animationDuration
			);
		} else {
			// Use dagre top-down layout for hierarchy
			this.runLayoutWithAnimationHandling(
				() =>
					this.cy!.layout({
						name: "dagre",
						rankDir: "TB", // Top to bottom hierarchy
						align: undefined,
						nodeSep: 80, // Horizontal spacing between nodes
						rankSep: 120, // Vertical spacing between levels
						edgeSep: 50, // Spacing between edges
						ranker: "network-simplex",
						animate: animationDuration > 0,
						animationDuration: animationDuration,
						animationEasing: "ease-out-cubic",
						fit: true,
						padding: 80,
					} as any),
				animationDuration
			);
		}
	}

	private applyRecursiveConstellationLayout(nodes: ElementDefinition[], animationDuration: number): void {
		if (!this.cy) return;

		const positioner = new ConstellationPositioner(this.cy, {
			baseOrbitalRadius: 150,
			minNodeDistance: 60,
			radiusIncrement: 30,
		});

		const nodePositions = new Map<string, { x: number; y: number }>();
		positioner.positionRecursiveConstellation(nodes, 0, 0, nodePositions);

		// Apply preset layout with animation if enabled
		this.runLayoutWithAnimationHandling(
			() =>
				this.cy!.layout({
					name: "preset",
					fit: true,
					padding: 120,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	/**
	 * Apply constellation layout for folder related mode.
	 * Positions multiple constellation groups on the canvas without overlaps.
	 */
	private applyFolderConstellationLayout(
		nodes: ElementDefinition[],
		_edges: ElementDefinition[],
		animationDuration: number
	): void {
		if (!this.cy) return;

		const positioner = new ConstellationPositioner(this.cy, {
			baseOrbitalRadius: 180,
			minNodeDistance: 90,
		});

		positioner.positionMultipleConstellations(nodes, 600, (groupNodes, centerX, centerY, positions) => {
			positioner.positionRecursiveConstellation(groupNodes, centerX, centerY, positions);
		});

		// Apply preset layout with animation if enabled
		this.runLayoutWithAnimationHandling(
			() =>
				this.cy!.layout({
					name: "preset",
					fit: true,
					padding: 120,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	/**
	 * Apply forest layout with vertical distribution for folder notes.
	 * Single-node trees are spread vertically, multi-node trees maintain hierarchy.
	 */
	private applyForestLayoutWithVerticalDistribution(
		nodes: ElementDefinition[],
		edges: ElementDefinition[],
		animationDuration: number
	): void {
		if (!this.cy) return;

		// First, apply dagre to get hierarchical structure
		const layout = this.cy!.layout({
			name: "dagre",
			rankDir: "TB",
			nodeSep: 80,
			rankSep: 120,
			edgeSep: 50,
			ranker: "network-simplex",
			animate: false, // No animation yet, we'll reposition
		} as any);

		layout.run();

		// Identify trees (connected components)
		const trees = this.nodeOrganizer.identifyConnectedComponents(nodes, edges);

		// Separate single-node trees from multi-node trees
		const { singleNodeTrees, multiNodeTrees } = this.nodeOrganizer.separateTreesBySize(trees);

		// Calculate bounds for multi-node trees
		const treeBounds: Array<{ tree: string[]; minX: number; maxX: number; minY: number; maxY: number }> = [];

		multiNodeTrees.forEach((tree) => {
			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;

			tree.forEach((nodeId) => {
				const cyNode = this.cy!.getElementById(nodeId);
				if (cyNode.length > 0) {
					const pos = cyNode.position();
					minX = Math.min(minX, pos.x);
					maxX = Math.max(maxX, pos.x);
					minY = Math.min(minY, pos.y);
					maxY = Math.max(maxY, pos.y);
				}
			});

			treeBounds.push({ tree, minX, maxX, minY, maxY });
		});

		// Sort multi-node trees by width (narrower first, easier to pack)
		treeBounds.sort((a, b) => a.maxX - a.minX - (b.maxX - b.minX));

		// Position multi-node trees with staggered vertical starts
		const TREE_HORIZONTAL_SPACING = 150;
		const VERTICAL_STAGGER = 200; // Stagger start heights

		let currentX = 0;
		let maxCanvasHeight = 0;

		treeBounds.forEach((bounds, index) => {
			const { tree, minX, minY } = bounds;
			const treeHeight = bounds.maxY - minY;

			// Stagger vertical start (every other tree offset)
			const verticalOffset = (index % 2) * VERTICAL_STAGGER;

			// Calculate translation
			const translateX = currentX - minX;
			const translateY = verticalOffset - minY;

			// Apply translation to all nodes in this tree
			tree.forEach((nodeId) => {
				const cyNode = this.cy!.getElementById(nodeId);
				if (cyNode.length > 0) {
					const pos = cyNode.position();
					cyNode.position({
						x: pos.x + translateX,
						y: pos.y + translateY,
					});
				}
			});

			// Update current position
			currentX += bounds.maxX - minX + TREE_HORIZONTAL_SPACING;
			maxCanvasHeight = Math.max(maxCanvasHeight, treeHeight + verticalOffset);
		});

		// Now distribute single-node trees across the available space using a grid layout
		if (singleNodeTrees.length > 0) {
			this.distributeSingleNodesInGrid(singleNodeTrees, treeBounds, currentX, maxCanvasHeight);
		}

		// Fit the graph to viewport with animation
		this.runLayoutWithAnimationHandling(
			() =>
				this.cy!.layout({
					name: "preset",
					fit: true,
					padding: 100,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	/**
	 * Distribute single-node trees across the canvas in a grid pattern.
	 * Uses space-filling algorithm to utilize entire canvas area efficiently.
	 */
	private distributeSingleNodesInGrid(
		singleNodeTrees: string[][],
		treeBounds: Array<{ tree: string[]; minX: number; maxX: number; minY: number; maxY: number }>,
		multiTreeEndX: number,
		maxMultiTreeHeight: number
	): void {
		if (!this.cy || singleNodeTrees.length === 0) return;

		const MIN_NODE_SPACING = 80;
		const PADDING = 50;

		// Calculate optimal grid dimensions based on available space and number of nodes
		const numNodes = singleNodeTrees.length;

		// Determine the optimal number of columns and rows
		// We want a roughly square grid, but adjust based on available space
		const aspectRatio = 1.5; // Prefer slightly wider than tall
		const cols = Math.ceil(Math.sqrt(numNodes * aspectRatio));
		const rows = Math.ceil(numNodes / cols);

		// Calculate cell size based on spacing requirements
		const cellWidth = MIN_NODE_SPACING * 1.5;
		const cellHeight = MIN_NODE_SPACING * 1.5;

		// Calculate total grid height for available space calculation
		const gridHeight = rows * cellHeight;

		// Determine starting position for the grid
		// Option 1: Place to the right of multi-node trees
		// Option 2: If there's vertical space, place below
		// Option 3: Fill gaps between multi-node trees

		const startX = multiTreeEndX + PADDING;
		const startY = PADDING;

		// If we have a lot of single nodes and limited horizontal space,
		// also use the space above/below multi-node trees
		const availableHeight = Math.max(gridHeight, maxMultiTreeHeight);

		// Position nodes in grid pattern with collision detection
		const positions: Array<{ nodeId: string; x: number; y: number }> = [];

		singleNodeTrees.forEach((tree, index) => {
			const col = index % cols;
			const row = Math.floor(index / cols);

			const x = startX + col * cellWidth;
			const y = startY + row * cellHeight;

			// Check for collision with multi-node trees
			let finalX = x;
			let finalY = y;
			let foundValidPosition = !this.collidesWithMultiTrees(x, y, treeBounds, MIN_NODE_SPACING);

			// If collision detected, try alternative positions
			if (!foundValidPosition) {
				// Try shifting horizontally
				for (let xOffset = 0; xOffset < 500; xOffset += cellWidth) {
					const testX = x + xOffset;
					if (!this.collidesWithMultiTrees(testX, y, treeBounds, MIN_NODE_SPACING)) {
						finalX = testX;
						finalY = y;
						foundValidPosition = true;
						break;
					}
				}
			}

			// If still no valid position, try vertical shift
			if (!foundValidPosition) {
				for (let yOffset = 0; yOffset < availableHeight; yOffset += cellHeight) {
					const testY = startY + yOffset;
					if (!this.collidesWithMultiTrees(x, testY, treeBounds, MIN_NODE_SPACING)) {
						finalX = x;
						finalY = testY;
						foundValidPosition = true;
						break;
					}
				}
			}

			positions.push({
				nodeId: tree[0],
				x: finalX,
				y: finalY,
			});
		});

		// Apply positions to nodes
		positions.forEach(({ nodeId, x, y }) => {
			const cyNode = this.cy!.getElementById(nodeId);
			if (cyNode.length > 0) {
				cyNode.position({ x, y });
			}
		});
	}

	private collidesWithMultiTrees(
		x: number,
		y: number,
		treeBounds: Array<{ minX: number; maxX: number; minY: number; maxY: number }>,
		padding: number
	): boolean {
		const collisionDetector = new CollisionDetector(0);
		return collisionDetector.collidesWithBounds(x, y, treeBounds, padding);
	}

	/**
	 * Executes a layout with proper animation handling and centering.
	 * Handles both animated and instant (no animation) layout scenarios.
	 */
	private runLayoutWithAnimationHandling(layoutFactory: () => cytoscape.Layouts, animationDuration: number): void {
		if (!this.cy) return;

		const layout = layoutFactory();

		// For animated layouts, center after animation completes
		if (animationDuration > 0) {
			this.cy.one("layoutstop", () => this.ensureCentered());
		}

		layout.run();

		// For instant layouts (no animation), center immediately
		if (animationDuration === 0) {
			setTimeout(() => {
				if (!this.cy) return;
				this.cy.resize();
				this.cy.fit();
				this.cy.center();
			}, 0);
		}
	}

	// Ensure the graph is centered/fit in its container, and handle zoom-mode centering
	private ensureCentered(): void {
		if (!this.cy || this.isUpdating) return;

		// Ensure Cytoscape recalculates viewport in case container size changed while hidden
		try {
			this.cy.resize();
		} catch {
			// ignore
		}

		// Defer to next frame to allow any DOM/layout changes to settle
		requestAnimationFrame(() => {
			if (!this.cy) return;
			const focusedNodeId = this.zoomManager.getFocusedNodeId();
			if (this.zoomManager.isInZoomMode() && focusedNodeId) {
				const node = this.cy.nodes().filter((n) => n.id() === focusedNodeId);
				if (node.length > 0) {
					// Center on the focused node without changing zoom level
					(this.cy as any).center(node);
					return;
				}
			}

			// Fit entire graph and ensure it's centered in view
			this.cy.fit();
			this.cy.center();
		});
	}

	private enterZoomMode(filePath: string): void {
		this.zoomManager.enterZoomMode(filePath, (el) => this.createZoomPreview(el, filePath));
	}

	private exitZoomMode(): void {
		this.zoomManager.exitZoomMode();
	}

	private focusOnNode(filePath: string): void {
		this.zoomManager.focusOnNode(filePath, (el) => this.createZoomPreview(el, filePath));
	}

	private createZoomPreview(el: HTMLElement, filePath: string): GraphZoomPreview {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			throw new Error(`File not found: ${filePath}`);
		}

		return new GraphZoomPreview(el, this.app, {
			file,
			onExit: () => this.exitZoomMode(),
			settingsStore: this.plugin.settingsStore,
			initialHideFrontmatter: this.zoomManager.getFrontmatterHideState(),
			initialHideContent: this.zoomManager.getContentHideState(),
			onToggleStatesChange: (hideFrontmatter, hideContent) => {
				this.zoomManager.updateHideStates(hideFrontmatter, hideContent);
			},
		});
	}

	public toggleHideContent(): void {
		this.zoomManager.toggleHideContent();
	}

	public toggleHideFrontmatter(): void {
		this.zoomManager.toggleHideFrontmatter();
	}

	private openFile(linkPath: string, event: MouseEvent): void {
		// Resolve the file
		const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, this.currentFile?.path || "");

		if (file instanceof TFile) {
			// Check for modifier keys
			const newLeaf = event.ctrlKey || event.metaKey;

			if (newLeaf) {
				this.app.workspace.getLeaf("tab").openFile(file);
			} else {
				this.app.workspace.getLeaf(false).openFile(file);
			}
		}
	}
}
