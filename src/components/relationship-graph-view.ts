import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { ItemView, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import { GraphBuilder } from "../core/graph-builder";
import type { Indexer } from "../core/indexer";
import type NexusPropertiesPlugin from "../main";
import { isFolderNote } from "../utils/file";
import { GraphFilter } from "./graph-filter";
import { GraphFilterPresetSelector } from "./graph-filter-preset-selector";
import { GraphHeader } from "./graph-header";
import { GraphInteractionHandler } from "./graph-interaction-handler";
import { GraphSearch } from "./graph-search";
import { GraphZoomManager } from "./graph-zoom-manager";
import { GraphZoomPreview } from "./graph-zoom-preview";
import { GraphLayoutManager } from "./layout/graph-layout-manager";
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
	private searchRowEl: HTMLElement | null = null;
	private graphFilter: GraphFilter | null = null;
	private graphFilterPresetSelector: GraphFilterPresetSelector | null = null;
	private zoomManager: GraphZoomManager;
	private interactionHandler: GraphInteractionHandler;
	private layoutManager: GraphLayoutManager;

	constructor(
		leaf: any,
		private readonly indexer: Indexer,
		private readonly plugin: NexusPropertiesPlugin
	) {
		super(leaf);
		this.contextMenu = new NodeContextMenu(this.app, this.plugin.settingsStore);
		this.graphBuilder = new GraphBuilder(this.app, this.indexer, this.plugin.settingsStore);

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

		this.propertyTooltip = new PropertyTooltip(this.app, {
			settingsStore: this.plugin.settingsStore,
			onFileOpen: (linkPath, event) => this.openFile(linkPath, event),
			isZoomMode: () => this.zoomManager.isInZoomMode(),
		});

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

		this.layoutManager = new GraphLayoutManager({
			getCy: () => {
				if (!this.cy) throw new Error("Cytoscape not yet initialized");
				return this.cy;
			},
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

		const settings = this.plugin.settingsStore.settings$.value;
		const showSearchBar = settings.showSearchBar;
		const showFilterBar = settings.showFilterBar;

		// Create search row wrapper
		const searchRowClasses = `nexus-graph-search-row${showSearchBar ? "" : " nexus-hidden"}`;
		this.searchRowEl = contentEl.createEl("div", {
			cls: searchRowClasses,
		});

		// Create search component inside the row
		this.graphSearch = new GraphSearch(
			this.searchRowEl,
			() => {
				this.updateGraph();
			},
			showSearchBar,
			() => {
				// onHide callback - hide the entire search row
				this.hideSearchRow();
			}
		);
		this.graphSearch.setPersistentlyVisible(showSearchBar);

		// Create filter preset selector and filter (in a row)
		const filterRowClasses = `nexus-graph-filter-row${showFilterBar ? "" : " nexus-hidden"}`;
		const filterRowEl = contentEl.createEl("div", {
			cls: filterRowClasses,
		});

		this.graphFilterPresetSelector = new GraphFilterPresetSelector(
			filterRowEl,
			settings.filterPresets,
			(expression: string) => {
				this.graphFilter?.setFilterValue(expression);
			},
			showFilterBar // Match parent visibility
		);

		this.graphFilter = new GraphFilter(
			filterRowEl,
			() => {
				this.updateGraph();
			},
			showFilterBar, // Match parent visibility
			() => {
				// onHide callback - hide the entire filter row (including preset selector)
				this.hideFilterRow();
			}
		);
		this.graphFilter.setPersistentlyVisible(showFilterBar);

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

		// Register ESC key to exit zoom mode
		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Escape") {
				// Only handle ESC if we're in zoom mode
				// Search/filter inputs handle their own ESC behavior
				if (this.zoomManager.isInZoomMode()) {
					evt.preventDefault();
					this.exitZoomMode();
				}
			}
		});

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe((settings) => {
			this.graphFilterPresetSelector?.updatePresets(settings.filterPresets);

			// Update persistent visibility state
			if (this.graphSearch) {
				this.graphSearch.setPersistentlyVisible(settings.showSearchBar);
			}
			if (this.graphFilter) {
				this.graphFilter.setPersistentlyVisible(settings.showFilterBar);
			}

			// Show/hide search row based on settings
			if (settings.showSearchBar) {
				this.showSearchRow();
			} else {
				this.hideSearchRow();
			}

			if (this.graphFilterPresetSelector) {
				if (settings.showFilterBar) {
					this.graphFilterPresetSelector.show();
				} else {
					this.graphFilterPresetSelector.hide();
				}
			}

			if (settings.showFilterBar) {
				this.showFilterRow();
			} else {
				this.hideFilterRow();
			}

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
		this.searchRowEl = null;

		if (this.graphFilter) {
			this.graphFilter.destroy();
			this.graphFilter = null;
		}

		if (this.graphFilterPresetSelector) {
			this.graphFilterPresetSelector.destroy();
			this.graphFilterPresetSelector = null;
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

		const settings = this.plugin.settingsStore.settings$.value;
		if (settings.showSearchBar) {
			// Flow 1: Always shown in settings -> just focus, ESC removes focus only
			this.graphSearch.focus();
		} else {
			// Flow 2: Hidden in settings -> command shows temporarily, ESC hides
			if (!this.graphSearch.isVisible()) {
				// Currently hidden, show it temporarily
				this.showSearchRow();
				this.graphSearch.show(); // This removes nexus-hidden from inner container AND focuses
			} else {
				// Currently visible, hide it
				this.graphSearch.hide(); // This will trigger onHide callback which hides searchRowEl
			}
		}
	}

	toggleFilter(): void {
		if (!this.graphFilter) return;

		const settings = this.plugin.settingsStore.settings$.value;
		if (settings.showFilterBar) {
			// If persistently visible, just focus the input
			this.graphFilter.focus();
		} else {
			// Toggle visibility
			if (!this.graphFilter.isVisible()) {
				// Currently hidden, show it temporarily
				this.showFilterRow();
				this.graphFilter.show(); // This removes nexus-hidden from inner container AND focuses
				this.graphFilterPresetSelector?.show();
			} else {
				// Currently visible, hide it
				this.graphFilter.hide(); // This will trigger onHide callback which hides filterRow
				this.graphFilterPresetSelector?.hide();
			}
		}
	}

	toggleFilterPreset(): void {
		if (!this.graphFilterPresetSelector || !this.graphFilter) return;

		const settings = this.plugin.settingsStore.settings$.value;
		if (settings.showFilterBar) {
			// If persistently visible, just focus the preset selector
			this.graphFilterPresetSelector.focus();
		} else {
			// Toggle visibility - check filter's visibility since they share the same row
			if (!this.graphFilter.isVisible()) {
				// Currently hidden, show the entire filter row
				this.showFilterRow();
				this.graphFilterPresetSelector.show(); // Show preset selector
				this.graphFilter.show(); // Show filter input
				this.graphFilterPresetSelector.focus(); // Focus preset selector
			} else {
				// Currently visible, hide the entire filter row
				this.hideFilterRow();
				this.graphFilterPresetSelector.hide();
				this.graphFilter.hide();
			}
		}
	}

	private showSearchRow(): void {
		if (this.searchRowEl) {
			this.searchRowEl.removeClass("nexus-hidden");
		}
		// Note: graphSearch is inside searchRowEl, so showing the row shows it automatically
	}

	private hideSearchRow(): void {
		if (this.searchRowEl) {
			this.searchRowEl.addClass("nexus-hidden");
		}
	}

	private showFilterRow(): void {
		const filterRow = this.containerEl.querySelector(".nexus-graph-filter-row");
		if (filterRow) {
			filterRow.removeClass("nexus-hidden");
		}
	}

	private hideFilterRow(): void {
		const filterRow = this.containerEl.querySelector(".nexus-graph-filter-row");
		if (filterRow) {
			filterRow.addClass("nexus-hidden");
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

			const searchQuery = this.graphSearch?.getCurrentValue() || "";
			const filterEvaluator = this.graphFilter?.getCurrentValue()
				? (frontmatter: Record<string, any>) => this.graphFilter!.shouldInclude(frontmatter)
				: undefined;

			const { nodes, edges } = this.graphBuilder.buildGraph({
				sourcePath: this.currentFile.path,
				renderRelated: this.renderRelated,
				includeAllRelated: this.includeAllRelated,
				startFromCurrent: this.ignoreTopmostParent,
				searchQuery: searchQuery,
				filterEvaluator: filterEvaluator,
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

		const isFolderNoteGraph = Boolean(this.currentFile && isFolderNote(this.currentFile.path));

		this.layoutManager.applyLayout(nodes, edges, {
			animationDuration,
			isFolderNote: isFolderNoteGraph,
			renderRelated: this.renderRelated,
			includeAllRelated: this.includeAllRelated,
		});
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
