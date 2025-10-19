import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { ItemView, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import { GraphBuilder } from "../core/graph-builder";
import type { Indexer } from "../core/indexer";
import type NexusPropertiesPlugin from "../main";
import { GraphHeader } from "./graph-header";
import { GraphSearch } from "./graph-search";
import { GraphZoomPreview } from "./graph-zoom-preview";
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
	private isZoomMode = false;
	// Track the currently focused node in zoom mode (used for state tracking)
	private focusedNodeId: string | null = null;
	private zoomPreview: GraphZoomPreview | null = null;
	private isUpdating = false;
	private graphBuilder: GraphBuilder;
	// Persistent toggle states for preview
	private previewHideFrontmatter = false;
	private previewHideContent = false;
	private settingsSubscription: Subscription | null = null;
	private propertyTooltip: PropertyTooltip | null = null;
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
		this.propertyTooltip = new PropertyTooltip(this.app, {
			settingsStore: this.plugin.settingsStore,
			onFileOpen: (linkPath, event) => this.openFile(linkPath, event),
			isZoomMode: () => this.isZoomMode,
		});
		this.graphBuilder = new GraphBuilder(this.app, this.indexer, this.plugin.settingsStore);
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

		// Initialize preview hide states from settings for new sessions
		const current = this.plugin.settingsStore.settings$.value;
		this.previewHideFrontmatter = current.zoomHideFrontmatterByDefault;
		this.previewHideContent = current.zoomHideContentByDefault;

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

		const skipFitOnce = this.suppressNextResizeFit;
		if (this.suppressNextResizeFit) {
			// Only skip fit/center once, but still refresh viewport size
			this.suppressNextResizeFit = false;
		}

		// Always notify cytoscape of size changes
		this.cy.resize();

		// Re-fit and re-center the graph using the shared helper (unless suppressed)
		if (!skipFitOnce) {
			this.ensureCentered();
		}
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
		if (this.propertyTooltip) {
			this.propertyTooltip.destroy();
			this.propertyTooltip = null;
		}

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

		if (!frontmatter) {
			this.showEmptyState("This file has no frontmatter properties.");
			return;
		}

		// Exit zoom mode when switching to a different file
		if (this.isZoomMode && this.currentFile && file.path !== this.currentFile.path) {
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
			// Update header title
			if (this.header) {
				this.header.updateTitle(this.currentFile.basename);
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
				if (this.propertyTooltip) {
					this.propertyTooltip.show(filePath, evt.originalEvent as MouseEvent);
				}
			}
		});

		// Hide tooltip on mouseout (with delay to allow moving to tooltip)
		this.cy.on("mouseout", "node", () => {
			if (this.propertyTooltip) {
				this.propertyTooltip.scheduleHide(300);
			}
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
				// Ensure container dimensions are accounted for, then fit once
				this.cy.resize();
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

	public toggleHideContent(): void {
		this.previewHideContent = !this.previewHideContent;
		if (this.zoomPreview) {
			this.zoomPreview.setHideContent(this.previewHideContent);
		}
	}

	public toggleHideFrontmatter(): void {
		this.previewHideFrontmatter = !this.previewHideFrontmatter;
		if (this.zoomPreview) {
			this.zoomPreview.setHideFrontmatter(this.previewHideFrontmatter);
		}
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
