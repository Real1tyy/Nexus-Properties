import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { ItemView, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { Indexer } from "../core/indexer";
import type NexusPropertiesPlugin from "../main";
import { extractDisplayName, extractFilePath, getFileContext } from "../utils/file";
import { FilterEvaluator } from "../utils/filters";
import { formatValueForNode } from "../utils/frontmatter-value";
import { GraphHeader } from "./graph-header";
import { GraphSearch } from "./graph-search";
import { GraphZoomPreview } from "./graph-zoom-preview";
import { NodeContextMenu } from "./node-context-menu";

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
	private isZoomMode = false;
	// Track the currently focused node in zoom mode (used for state tracking)
	private focusedNodeId: string | null = null;
	private zoomPreview: GraphZoomPreview | null = null;
	private isUpdating = false;
	private filterEvaluator!: FilterEvaluator;
	// Persistent toggle states for preview
	private previewHideFrontmatter = false;
	private previewHideContent = false;
	private settingsSubscription: Subscription | null = null;
	private propertyTooltip: HTMLElement | null = null;
	private hideTooltipTimer: number | null = null;
	// When exiting zoom, suppress the next resize-driven fit/center to avoid double snap
	private suppressNextResizeFit = false;
	// Search functionality
	private graphSearch: GraphSearch | null = null;
	private searchQuery = "";

	constructor(
		leaf: any,
		private readonly indexer: Indexer,
		private readonly plugin: NexusPropertiesPlugin
	) {
		super(leaf);
		this.contextMenu = new NodeContextMenu(this.app, this.plugin.settingsStore);
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

		// Initialize filter evaluator bound to live settings
		this.filterEvaluator = new FilterEvaluator(this.plugin.settingsStore.settings$);

		// Register event listener for active file changes
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				this.onFileOpen(file);
			})
		);

		// Register event listener for metadata changes (frontmatter updates)
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				// Only re-render if the changed file is the currently displayed file
				if (this.currentFile && file.path === this.currentFile.path) {
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

		// Register ESC key to exit zoom mode or hide search
		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Escape") {
				if (this.graphSearch?.isVisible()) {
					evt.preventDefault();
					this.graphSearch.hide();
				} else if (this.isZoomMode) {
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
		// Skip one resize-fit if we're already handling a programmatic fit on exit
		if (this.suppressNextResizeFit) {
			this.suppressNextResizeFit = false;
			return;
		}

		if (!this.cy || !this.currentFile || this.isUpdating) return;

		// Re-fit and re-center the graph using the shared helper
		this.ensureCentered();
	}

	async onClose(): Promise<void> {
		// Clean up resize observer
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// Clean up resize debounce timer
		if (this.resizeDebounceTimer !== null) {
			window.clearTimeout(this.resizeDebounceTimer);
			this.resizeDebounceTimer = null;
		}

		// Clean up settings subscription
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		// Clean up tooltip
		this.hidePropertyTooltip();

		// Clean up search component
		if (this.graphSearch) {
			this.graphSearch.destroy();
			this.graphSearch = null;
		}

		this.destroyGraph();

		if (this.header) {
			this.header.destroy();
			this.header = null;
		}

		if (this.zoomPreview) {
			this.zoomPreview.destroy();
			this.zoomPreview = null;
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

		if (!frontmatter) {
			this.showEmptyState("This file has no frontmatter properties.");
			return;
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
			// Update header title
			if (this.header) {
				this.header.updateTitle(this.currentFile.basename);
			}

			// Rebuild graph based on mode (but not for zoom mode - zoom mode just focuses on existing graph)
			let nodes: ElementDefinition[];
			let edges: ElementDefinition[];

			if (this.renderRelated) {
				({ nodes, edges } = this.buildRelatedGraphData(this.currentFile.path));
			} else {
				({ nodes, edges } = this.buildGraphData(this.currentFile.path));
			}

			// Apply filtering of nodes and edges based on frontmatter
			({ nodes, edges } = this.applyGraphFilters(nodes, edges));

			this.destroyGraph();

			if (this.graphContainerEl) {
				this.graphContainerEl.empty();
			}

			this.initializeCytoscape();
			this.renderGraph(nodes, edges);
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
						"background-color": "#e9f2ff",
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
						"transition-property": "overlay-opacity, overlay-padding, width, height",
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
						"background-color": "#ffd89b",
						"border-color": "#fff",
						"border-width": 3,
						"font-weight": "bold",
						"font-size": 13,
						color: "#ffeaa7",
						"text-max-width": "160px",
						"overlay-color": "#ffd89b",
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
						"background-color": "#a8daff",
						"overlay-padding": 16,
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

		// Add sparkle animation to random nodes
		this.addSparkleAnimations();

		// Interactive hover effects
		this.cy.on("mouseover", "node", (evt) => {
			if (!this.cy) return;
			const node = evt.target;
			this.cy.elements().removeClass("dim");
			this.cy.elements().not(node.closedNeighborhood()).addClass("dim");
			node.closedNeighborhood("edge").addClass("highlighted");
		});

		this.cy.on("mouseout", "node", () => {
			if (!this.cy) return;
			this.cy.elements().removeClass("dim highlighted");
		});

		// Hover handler for preview popover and property tooltip
		this.cy.on("mouseover", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const file = this.app.vault.getAbstractFileByPath(filePath);

			if (file instanceof TFile) {
				// Trigger Obsidian's hover preview
				this.app.workspace.trigger("hover-link", {
					event: evt.originalEvent,
					source: VIEW_TYPE_RELATIONSHIP_GRAPH,
					hoverParent: this,
					targetEl: this.graphContainerEl,
					linktext: file.path,
					sourcePath: this.currentFile?.path || "",
				});

				// Show property tooltip if properties are configured
				this.showPropertyTooltip(filePath, evt);
			}
		});

		// Hide tooltip on mouseout (with delay to allow moving to tooltip)
		this.cy.on("mouseout", "node", () => {
			// Clear any existing timer
			if (this.hideTooltipTimer !== null) {
				window.clearTimeout(this.hideTooltipTimer);
			}

			// Start a timer to hide the tooltip (gives user time to move into it)
			this.hideTooltipTimer = window.setTimeout(() => {
				this.hidePropertyTooltip();
				this.hideTooltipTimer = null;
			}, 300);
		});

		// Click handler to enter zoom mode and focus on node
		this.cy.on("tap", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const file = this.app.vault.getAbstractFileByPath(filePath);
			const originalEvent = evt.originalEvent as MouseEvent;

			if (file instanceof TFile) {
				// Ctrl+click (or Cmd+click on Mac) opens file in new tab
				if (originalEvent && (originalEvent.ctrlKey || originalEvent.metaKey)) {
					this.app.workspace.getLeaf("tab").openFile(file);
					return;
				}

				if (this.isZoomMode) {
					// In zoom mode, focus on the clicked node
					this.focusOnNode(filePath);
				} else {
					// Enter zoom mode by clicking on node
					this.enterZoomMode(filePath);
				}
			}
		});

		// Edge click handler for zoom mode navigation
		this.cy.on("tap", "edge", (evt) => {
			if (!this.isZoomMode) return;

			const edge = evt.target;
			const targetId = edge.data("target");
			const sourceId = edge.data("source");

			// If target is already focused, navigate to source instead (bidirectional navigation)
			const nodeToFocus = targetId === this.focusedNodeId ? sourceId : targetId;
			this.focusOnNode(nodeToFocus);
		});

		// Right-click handler for context menu
		this.cy.on("cxttap", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const originalEvent = evt.originalEvent as MouseEvent;

			if (this.contextMenu) {
				this.contextMenu.show(originalEvent, filePath);
			}
		});
	}

	private addSparkleAnimations(): void {
		if (!this.cy) return;

		this.cy.nodes().forEach((node) => {
			if (Math.random() < 0.4) {
				node.addClass("glow");
				const pulse = (): void => {
					// Check if cy still exists and node is still in the graph before animating
					if (!this.cy || !node.cy() || this.isUpdating) {
						return;
					}
					node.animate({ style: { "overlay-opacity": 0.35 } }, { duration: 1500, easing: "ease-in-out" }).animate(
						{ style: { "overlay-opacity": 0.12 } },
						{
							duration: 1500,
							easing: "ease-in-out",
							complete: pulse,
						}
					);
				};
				// Stagger animation start
				setTimeout(() => pulse(), Math.random() * 1000);
			}
		});
	}

	private renderGraph(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
		if (!this.cy) return;

		this.cy.add([...nodes, ...edges]);

		const settings = this.plugin.settingsStore.settings$.value;
		const animationDuration = settings.graphAnimationDuration;

		if (this.renderRelated) {
			// Use concentric layout for constellation/nebula pattern
			// Central star (source) in the middle, related nodes in outer orbit
			const layout = this.cy.layout({
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
			});

			// Ensure final view is centered once layout completes
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
		} else {
			// Use dagre top-down layout for hierarchy
			const layout = this.cy.layout({
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
			} as any);

			// Ensure final view is centered once layout completes
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
			if (this.isZoomMode && this.focusedNodeId) {
				const node = this.cy.nodes().filter((n) => n.id() === this.focusedNodeId);
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

	private buildRelatedGraphData(sourcePath: string): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		const addNode = (pathOrWikiLink: string, isSource: boolean): void => {
			const filePath = extractFilePath(pathOrWikiLink);
			if (processedNodes.has(filePath)) return;

			processedNodes.add(filePath);
			const displayName = extractDisplayName(pathOrWikiLink);

			const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
			const estimatedHeight = 45;

			nodes.push({
				data: {
					id: filePath,
					label: displayName,
					level: isSource ? 0 : 1,
					isSource: isSource,
					width: estimatedWidth,
					height: estimatedHeight,
				},
			});
		};

		// Add central node (current file)
		addNode(sourcePath, true);

		// Get relationships for current file
		const context = getFileContext(this.app, sourcePath);
		if (context.file && context.frontmatter) {
			const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

			const allRelated = this.includeAllRelated
				? this.computeAllRelatedRecursively(sourcePath, rels.related)
				: [...rels.related];

			for (const relatedWikiLink of allRelated) {
				const relatedPath = extractFilePath(relatedWikiLink);

				if (!processedNodes.has(relatedPath)) {
					addNode(relatedWikiLink, false);

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

	private buildGraphData(sourcePath: string): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		const rootPath = this.ignoreTopmostParent ? sourcePath : this.findTopmostParent(sourcePath);

		const addNode = (pathOrWikiLink: string, level: number, isSource: boolean): void => {
			const filePath = extractFilePath(pathOrWikiLink);
			if (processedNodes.has(filePath)) return;

			processedNodes.add(filePath);
			const displayName = extractDisplayName(pathOrWikiLink);

			const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
			const estimatedHeight = 45;

			nodes.push({
				data: {
					id: filePath,
					label: displayName,
					level: level,
					isSource: isSource,
					width: estimatedWidth,
					height: estimatedHeight,
				},
			});
		};

		const buildDownwardsBFS = (): void => {
			const queue: Array<{ path: string; level: number }> = [{ path: rootPath, level: 0 }];
			addNode(rootPath, 0, rootPath === sourcePath);

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
						addNode(childWikiLink, currentLevel + 1, isSource);

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
		};

		buildDownwardsBFS();

		return { nodes, edges };
	}

	private applyGraphFilters(
		nodes: ElementDefinition[],
		edges: ElementDefinition[]
	): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const keepNodeIds = new Set<string>();

		for (const n of nodes) {
			const id = n.data?.id as string | undefined;
			if (!id) continue;

			// Always keep source node
			if (n.data?.isSource) {
				keepNodeIds.add(id);
				continue;
			}

			// Apply search filter if active
			if (this.searchQuery) {
				const nodeName = ((n.data?.label as string) || "").toLowerCase();
				if (!nodeName.includes(this.searchQuery)) {
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

		const filteredNodes = nodes.filter((n) => keepNodeIds.has(n.data?.id as string));
		const filteredEdges = edges.filter(
			(e) => keepNodeIds.has(e.data?.source as string) && keepNodeIds.has(e.data?.target as string)
		);

		return { nodes: filteredNodes, edges: filteredEdges };
	}

	private enterZoomMode(filePath: string): void {
		this.isZoomMode = true;
		this.focusOnNode(filePath);
	}

	private exitZoomMode(): void {
		this.isZoomMode = false;
		this.focusedNodeId = null;
		// Stop any ongoing animations before resetting view
		if (this.cy) {
			this.cy.stop();
		}
		this.hidePreviewOverlay();
		// Reset zoom to show full graph exactly once. We suppress the next resize-driven
		// fit since removing the preview changes layout and triggers a resize.
		if (this.cy && !this.isUpdating) {
			this.suppressNextResizeFit = true;
			// Defer until after DOM reflow so container size is final
			requestAnimationFrame(() => {
				if (!this.cy) return;
				this.cy.fit();
				this.cy.center();
			});
		}
	}

	private focusOnNode(filePath: string): void {
		this.focusedNodeId = filePath;
		const file = this.app.vault.getAbstractFileByPath(filePath);

		if (!(file instanceof TFile)) return;

		// Zoom to the focused node on the existing graph with stronger zoom
		if (this.cy && !this.isUpdating) {
			// Use filter instead of selector to avoid escaping issues with complex file paths
			const node = this.cy.nodes().filter((n) => n.id() === filePath);
			if (node.length > 0) {
				this.cy.animate(
					{
						zoom: 2.5,
						center: {
							eles: node,
						},
					},
					{
						duration: 500,
						easing: "ease-out-cubic",
					}
				);
			}
		}

		// Show the preview overlay at the top
		this.showPreviewOverlay(file);
	}

	private async showPreviewOverlay(file: TFile): Promise<void> {
		if (!this.previewWrapperEl) return;

		// Remove existing overlay if any
		this.hidePreviewOverlay();

		// Create preview in the wrapper element (between header and graph)
		this.zoomPreview = new GraphZoomPreview(this.previewWrapperEl, this.app, {
			file,
			onExit: () => this.exitZoomMode(),
			settingsStore: this.plugin.settingsStore,
			initialHideFrontmatter: this.previewHideFrontmatter,
			initialHideContent: this.previewHideContent,
			onToggleStatesChange: (hideFrontmatter, hideContent) => {
				this.previewHideFrontmatter = hideFrontmatter;
				this.previewHideContent = hideContent;
			},
		});
	}

	private hidePreviewOverlay(): void {
		if (this.zoomPreview) {
			this.zoomPreview.destroy();
			this.zoomPreview = null;
		}
	}

	/**
	 * Shows a tooltip with frontmatter properties when hovering over a node.
	 */
	private showPropertyTooltip(filePath: string, evt: any): void {
		const settings = this.plugin.settingsStore.settings$.value;

		if (settings.displayNodeProperties.length === 0) {
			return;
		}

		const context = getFileContext(this.app, filePath);
		if (!context.file || !context.frontmatter) {
			return;
		}

		const { frontmatter } = context;

		const propertyData = settings.displayNodeProperties
			.map((propName) => {
				const value = frontmatter[propName];
				return value !== undefined && value !== null ? { key: propName, value } : null;
			})
			.filter((prop): prop is { key: string; value: unknown } => prop !== null);

		// Create tooltip element
		this.hidePropertyTooltip();
		this.propertyTooltip = document.createElement("div");
		this.propertyTooltip.addClass("nexus-property-tooltip");

		// Keep tooltip open when hovering over it
		this.propertyTooltip.addEventListener("mouseenter", () => {
			// Cancel any pending hide timer
			if (this.hideTooltipTimer !== null) {
				window.clearTimeout(this.hideTooltipTimer);
				this.hideTooltipTimer = null;
			}
		});

		this.propertyTooltip.addEventListener("mouseleave", () => {
			// Hide immediately when leaving the tooltip
			this.hidePropertyTooltip();
		});

		// Add clickable title at the top
		const displayName = extractDisplayName(filePath);
		const titleEl = this.propertyTooltip.createEl("div", {
			cls: "nexus-property-tooltip-title",
		});

		const titleLink = titleEl.createEl("a", {
			text: displayName,
			cls: "nexus-property-tooltip-title-link",
		});

		titleLink.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.openFile(filePath, e);
		});

		// Add separator if there are properties
		if (propertyData.length > 0) {
			this.propertyTooltip.createDiv("nexus-property-tooltip-separator");
		}

		for (const { key, value } of propertyData) {
			const propEl = this.propertyTooltip.createDiv("nexus-property-tooltip-item");
			const keyEl = propEl.createSpan("nexus-property-tooltip-key");
			keyEl.setText(`${key}:`);
			const valueEl = propEl.createSpan("nexus-property-tooltip-value");

			// Render value with clickable links
			this.renderPropertyValue(valueEl, value);
		}

		// Position tooltip to the left of cursor to avoid context menu overlap
		// NOTE: Inline styles are acceptable here - runtime-calculated position during hover interaction
		const mouseEvent = evt.originalEvent as MouseEvent;
		document.body.appendChild(this.propertyTooltip);

		// Position to the left to avoid context menu (which appears on right-click)
		const offsetX = 35;
		const offsetY = 10;

		// Check if tooltip would go off-screen and adjust if needed
		const tooltipRect = this.propertyTooltip.getBoundingClientRect();
		let left = mouseEvent.clientX - tooltipRect.width - offsetX;
		const top = mouseEvent.clientY + offsetY;

		// If tooltip goes off the left edge, position to the right of cursor instead
		if (left < 0) {
			left = mouseEvent.clientX + 15;
		}

		// Ensure tooltip doesn't go off the bottom
		let adjustedTop = top;
		if (top + tooltipRect.height > window.innerHeight) {
			adjustedTop = window.innerHeight - tooltipRect.height - 10;
		}

		this.propertyTooltip.style.left = `${left}px`;
		this.propertyTooltip.style.top = `${adjustedTop}px`;
	}

	/**
	 * Renders a property value with clickable wiki links.
	 */
	private renderPropertyValue(container: HTMLElement, value: unknown): void {
		if (value === null || value === undefined) {
			container.setText("");
			return;
		}

		// Handle arrays
		if (Array.isArray(value)) {
			const stringValues = value.filter((item) => typeof item === "string");

			if (stringValues.length === 0) {
				container.setText("");
				return;
			}

			// Render each item
			for (let i = 0; i < stringValues.length; i++) {
				if (i > 0) {
					container.createSpan({ text: ", ", cls: "nexus-property-separator" });
				}
				this.renderStringValue(container, stringValues[i]);
			}
			return;
		}

		// Handle strings
		if (typeof value === "string") {
			this.renderStringValue(container, value);
			return;
		}

		// Handle booleans
		if (typeof value === "boolean") {
			container.setText(value ? "Yes" : "No");
			return;
		}

		// Handle numbers
		if (typeof value === "number") {
			container.setText(value.toString());
			return;
		}

		// Handle objects
		if (typeof value === "object") {
			container.setText(formatValueForNode(value, 30));
			return;
		}

		container.setText(String(value));
	}

	/**
	 * Renders a string value, converting wiki links to clickable elements.
	 */
	private renderStringValue(container: HTMLElement, text: string): void {
		// Parse for wiki links
		const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
		let lastIndex = 0;
		const matches = text.matchAll(wikiLinkRegex);
		let hasMatches = false;

		for (const match of matches) {
			hasMatches = true;

			// Add text before the link
			if (match.index !== undefined && match.index > lastIndex) {
				container.createSpan({ text: text.substring(lastIndex, match.index) });
			}

			// Create clickable link
			const linkPath = match[1];
			const displayText = match[2] || linkPath;

			const linkEl = container.createEl("a", {
				text: displayText,
				cls: "nexus-property-link",
			});

			linkEl.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.openFile(linkPath, e);
			});

			lastIndex = (match.index ?? 0) + match[0].length;
		}

		// Add remaining text
		if (hasMatches && lastIndex < text.length) {
			container.createSpan({ text: text.substring(lastIndex) });
		}

		// If no wiki links found, just add the text
		if (!hasMatches) {
			container.setText(text);
		}
	}

	/**
	 * Opens a file using Obsidian's API.
	 */
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

	/**
	 * Hides the property tooltip.
	 */
	private hidePropertyTooltip(): void {
		// Clear any pending hide timer
		if (this.hideTooltipTimer !== null) {
			window.clearTimeout(this.hideTooltipTimer);
			this.hideTooltipTimer = null;
		}

		if (this.propertyTooltip) {
			this.propertyTooltip.remove();
			this.propertyTooltip = null;
		}
	}
}
