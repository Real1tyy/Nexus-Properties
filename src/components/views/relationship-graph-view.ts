import { isFolderNote, RegisteredEventsComponent } from "@real1ty-obsidian-plugins";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { type App, Notice, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import { GraphBuilder } from "../../core/graph-builder";
import type { Indexer } from "../../core/indexer";
import type NexusPropertiesPlugin from "../../main";
import { cls } from "../../utils/css";
import { EdgeContextMenu } from "../graph/edge-context-menu";
import { GraphFilterPresetSelector } from "../graph/filter-preset-selector";
import { GraphHeader } from "../graph/header";
import { GraphInteractionHandler } from "../graph/interaction-handler";
import { NodeContextMenu } from "../graph/node-context-menu";
import { ZoomIndicator } from "../graph/zoom-indicator";
import { GraphZoomManager } from "../graph/zoom-manager";
import { GraphZoomPreview } from "../graph/zoom-preview";
import { GraphFilter } from "../input-managers/graph-filter";
import { GraphSearch } from "../input-managers/graph-search";
import { GraphLayoutManager } from "../layout/graph-layout-manager";
import { PropertyTooltip } from "../property-tooltip";
import { RelationshipAdder } from "../relationship-adder";

cytoscape.use(cytoscapeDagre);

const VIEW_TYPE_RELATIONSHIP_GRAPH = "nexus-relationship-graph-view";

/**
 * Graph rendering component (not an ItemView)
 * Can be embedded in any container
 */
export class RelationshipGraphView extends RegisteredEventsComponent {
	private cy: Core | null = null;
	private graphContainerEl: HTMLElement | null = null;
	private previewWrapperEl: HTMLElement | null = null;
	private header: GraphHeader | null = null;
	private currentFile: TFile | null = null;
	private ignoreTopmostParent = false;
	private renderRelated = false;
	private includeAllRelated = false;
	private nodeContextMenu: NodeContextMenu;
	private edgeContextMenu: EdgeContextMenu;
	private relationshipAdder: RelationshipAdder;
	private resizeObserver: ResizeObserver | null = null;
	private resizeDebounceTimer: number | null = null;
	private isUpdating = false;
	private graphBuilder: GraphBuilder;
	private settingsSubscription: Subscription | null = null;
	private indexerSubscription: Subscription | null = null;
	private propertyTooltip: PropertyTooltip;
	private graphSearch: GraphSearch | null = null;
	private searchRowEl: HTMLElement | null = null;
	private graphFilter: GraphFilter | null = null;
	private graphFilterPresetSelector: GraphFilterPresetSelector | null = null;
	private filterRowEl: HTMLElement | null = null;
	private zoomManager: GraphZoomManager;
	private interactionHandler: GraphInteractionHandler;
	private layoutManager: GraphLayoutManager;
	private zoomIndicator: ZoomIndicator | null = null;
	private pendingGraphData: {
		nodes: ElementDefinition[];
		edges: ElementDefinition[];
	} | null = null;
	private onViewTypeChangeCallback: (() => void) | null = null;

	constructor(
		private readonly app: App,
		private readonly indexer: Indexer,
		private readonly plugin: NexusPropertiesPlugin,
		private readonly containerEl: HTMLElement
	) {
		super();
		this.relationshipAdder = new RelationshipAdder(this.app, this.plugin.settingsStore, () => {
			this.updateGraph();
		});
		this.nodeContextMenu = new NodeContextMenu(this.app, this.plugin.settingsStore, {
			onStartRelationship: (sourceNodePath, relationshipType) => {
				this.relationshipAdder.startSelection(sourceNodePath, relationshipType);
			},
			onRenderAsRoot: (nodeId) => {
				this.renderNodeAsRoot(nodeId);
			},
		});
		this.edgeContextMenu = new EdgeContextMenu(this.app, this.plugin.settingsStore, () => {
			this.updateGraph();
		});
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

		this.interactionHandler = new GraphInteractionHandler(
			this.app,
			this.propertyTooltip,
			this.nodeContextMenu,
			this.edgeContextMenu,
			this.relationshipAdder,
			{
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
				isRelatedView: () => this.renderRelated,
				focusedNodeId: () => this.zoomManager.getFocusedNodeId(),
				isUpdating: () => this.isUpdating,
			}
		);

		this.layoutManager = new GraphLayoutManager({
			getCy: () => {
				if (!this.cy) throw new Error("Cytoscape not yet initialized");
				return this.cy;
			},
		});
	}

	async render(): Promise<void> {
		this.containerEl.empty();
		this.containerEl.addClass(cls("graph-view-content"));

		this.header = new GraphHeader(this.containerEl, {
			currentFileName: "No file selected",
			renderRelated: this.renderRelated,
			includeAllRelated: this.includeAllRelated,
			startFromCurrent: this.ignoreTopmostParent,
			isFolderNote: false,
			onRenderRelatedChange: (value) => {
				this.renderRelated = value;
				this.updateGraph();
				this.notifyViewTypeChange();
			},
			onIncludeAllRelatedChange: (value) => {
				this.includeAllRelated = value;
				this.updateGraph();
				this.notifyViewTypeChange();
			},
			onStartFromCurrentChange: (value) => {
				this.ignoreTopmostParent = value;
				this.updateGraph();
			},
		});

		const settings = this.plugin.settingsStore.settings$.value;
		const showSearchBar = settings.showSearchBar;
		const showFilterBar = settings.showFilterBar;
		const isMobile = window.innerWidth <= 600;

		// Shared callbacks
		const onFilterPresetChange = (expression: string) => {
			this.graphFilter?.setFilterValue(expression);
		};

		const onSearchChange = () => {
			this.updateGraph();
		};

		const onFilterChange = () => {
			this.updateGraph();
		};

		// Inner function to create filter preset selector
		const createFilterPresetSelector = (container: HTMLElement) => {
			this.graphFilterPresetSelector = new GraphFilterPresetSelector(
				container,
				settings.filterPresets,
				onFilterPresetChange,
				showFilterBar
			);
		};

		// Inner function to create search component
		const createSearchComponent = (container: HTMLElement, onHide: () => void) => {
			this.graphSearch = new GraphSearch(container, onSearchChange, showSearchBar, onHide);
			this.graphSearch.setPersistentlyVisible(showSearchBar);
		};

		// Inner function to create filter component
		const createFilterComponent = (container: HTMLElement, onHide: () => void) => {
			this.graphFilter = new GraphFilter(container, onFilterChange, showFilterBar, onHide);
			this.graphFilter.setPersistentlyVisible(showFilterBar);
		};

		if (isMobile) {
			// Mobile: Filter preset in header, search + filter combined in one row
			const controlsContainer = this.header?.getControlsContainer();
			if (controlsContainer) {
				createFilterPresetSelector(controlsContainer);
			}
			// Combined search/filter row
			const filterRowClasses =
				showFilterBar || showSearchBar ? cls("graph-filter-row") : cls("graph-filter-row", "hidden");
			const filterRowEl = this.containerEl.createEl("div", {
				cls: filterRowClasses,
			});

			const searchContainer = filterRowEl.createEl("div", {
				cls: cls("graph-search-input-container"),
			});
			createSearchComponent(searchContainer, () => this.hideFilterRow());
			createFilterComponent(filterRowEl, () => this.hideFilterRow());

			this.filterRowEl = filterRowEl;
		} else {
			// Desktop: Separate rows for search and filter
			const searchRowClasses = showSearchBar ? cls("graph-search-row") : cls("graph-search-row", "hidden");
			this.searchRowEl = this.containerEl.createEl("div", {
				cls: searchRowClasses,
			});
			createSearchComponent(this.searchRowEl, () => this.hideSearchRow());

			const filterRowClasses = showFilterBar ? cls("graph-filter-row") : cls("graph-filter-row", "hidden");
			const filterRowEl = this.containerEl.createEl("div", {
				cls: filterRowClasses,
			});

			createFilterPresetSelector(filterRowEl);
			createFilterComponent(filterRowEl, () => this.hideFilterRow());

			this.filterRowEl = filterRowEl;
		}

		this.applyPreFillFilter();

		// Create a wrapper for zoom preview (sits between header and graph)
		// This container will hold the zoom preview when active
		this.previewWrapperEl = this.containerEl.createEl("div", {
			cls: cls("graph-zoom-preview-wrapper"),
		});

		// Create graph container
		this.graphContainerEl = this.containerEl.createEl("div", {
			cls: cls("graph-view-container"),
		});

		// Register event listeners
		this.registerEvent(this.app.workspace, "file-open", (file) => {
			this.onFileOpen(file instanceof TFile ? file : null);
		});

		// Subscribe to indexer events for reactive updates
		// This handles file changes, renames, and deletions after indexer has processed them
		this.indexerSubscription = this.indexer.events$.subscribe((event) => {
			if (!this.currentFile) return;
			if (event.filePath === this.currentFile.path) {
				this.updateGraph();
			}
		});

		setTimeout(() => {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) {
				this.onFileOpen(activeFile);
			}
		}, 50);

		// Set up resize observer with debouncing
		this.setupResizeObserver();

		// Also react to global window resizes
		this.registerDomEvent(window, "resize", () => {
			this.handleResize();
		});

		this.graphContainerEl.addEventListener("nexus-graph-resize", () => {
			this.handleResize();
		});

		// Register ESC key to exit zoom mode
		this.registerDomEvent(document, "keydown", (evt) => {
			if (evt.key === "Escape") {
				// Only handle ESC if we're in zoom mode
				// Search/filter inputs handle their own ESC behavior
				if (this.zoomManager.isInZoomMode()) {
					evt.preventDefault();
					this.exitZoomMode();
				}
			}
		});

		// Register keyboard shortcuts for graph navigation
		this.registerDomEvent(document, "keydown", (evt) => {
			// Only handle shortcuts if we're in zoom mode and not typing in an input
			if (!this.zoomManager.isInZoomMode()) return;

			const target = evt.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
				return;
			}

			const focusedNodeId = this.zoomManager.getFocusedNodeId();
			if (!focusedNodeId) return;

			let targetNodeId: string | null = null;

			// Check for Enter/Shift+Enter for tree navigation (folder notes only)
			const isFolderNoteGraph = Boolean(this.currentFile && isFolderNote(this.currentFile.path));
			if (isFolderNoteGraph && !this.renderRelated) {
				if (evt.key === "Enter") {
					evt.preventDefault();
					if (evt.shiftKey) {
						targetNodeId = this.interactionHandler.navigateToPreviousTreeRoot(focusedNodeId);
					} else {
						targetNodeId = this.interactionHandler.navigateToNextTreeRoot(focusedNodeId);
					}
					if (targetNodeId) {
						this.focusOnNode(targetNodeId);
					}
					return;
				}
			}

			switch (evt.key) {
				case "ArrowUp":
					evt.preventDefault();
					targetNodeId = this.interactionHandler.navigateToParent(focusedNodeId);
					break;
				case "ArrowDown":
					evt.preventDefault();
					targetNodeId = this.interactionHandler.navigateToChild(focusedNodeId);
					break;
				case "ArrowLeft":
					evt.preventDefault();
					targetNodeId = this.interactionHandler.navigateToLeft(focusedNodeId);
					break;
				case "ArrowRight":
					evt.preventDefault();
					targetNodeId = this.interactionHandler.navigateToRight(focusedNodeId);
					break;
			}

			if (targetNodeId) {
				this.focusOnNode(targetNodeId);
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

			// Show/hide zoom indicator based on settings
			if (settings.showZoomIndicator && !this.zoomIndicator && this.cy && this.filterRowEl) {
				this.zoomIndicator = new ZoomIndicator(this.filterRowEl, this.cy);
			} else if (!settings.showZoomIndicator && this.zoomIndicator) {
				this.zoomIndicator.destroy();
				this.zoomIndicator = null;
			}

			if (this.currentFile && !this.isUpdating) {
				this.updateGraph();
			}
		});
	}

	private setupResizeObserver(): void {
		if (!this.graphContainerEl) return;

		this.resizeObserver = new ResizeObserver(() => {
			// Clear previous timer
			if (this.resizeDebounceTimer !== null) {
				window.clearTimeout(this.resizeDebounceTimer);
			}

			this.resizeDebounceTimer = window.setTimeout(() => {
				requestAnimationFrame(() => {
					if (this.pendingGraphData && !this.cy) {
						const rect = this.graphContainerEl?.getBoundingClientRect();
						if (rect && rect.width > 0 && rect.height > 0) {
							this.initializeCytoscape();
							if (this.cy && this.pendingGraphData) {
								this.renderAndFitGraph(this.pendingGraphData.nodes, this.pendingGraphData.edges);
								this.pendingGraphData = null;
							}
						}
					}
					this.handleResize();
				});
			}, 100);
		});

		this.resizeObserver.observe(this.graphContainerEl);
	}

	public handleResize(): void {
		if (!this.cy || !this.graphContainerEl?.isConnected) return;

		const skipFitOnce = this.zoomManager.shouldSuppressNextResizeFit();

		// Batch layout reads and writes to prevent forced reflows
		// Read phase: check dimensions
		const rect = this.graphContainerEl.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;

		// Write phase: update Cytoscape
		this.cy.resize();

		// Re-fit and re-center the graph using the shared helper (unless suppressed)
		if (!skipFitOnce) {
			this.ensureCentered();
		}
	}

	destroy(): void {
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

		if (this.indexerSubscription) {
			this.indexerSubscription.unsubscribe();
			this.indexerSubscription = null;
		}

		this.cleanupEvents();

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
		this.filterRowEl = null;
		this.pendingGraphData = null;
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
			this.searchRowEl.removeClass(cls("hidden"));
		}
		// Note: graphSearch is inside searchRowEl, so showing the row shows it automatically
	}

	private hideSearchRow(): void {
		if (this.searchRowEl) {
			this.searchRowEl.addClass(cls("hidden"));
		}
	}

	private showFilterRow(): void {
		const filterRow = this.containerEl.querySelector(`.${cls("graph-filter-row")}`);
		if (filterRow) {
			filterRow.removeClass(cls("hidden"));
		}
	}

	private hideFilterRow(): void {
		const filterRow = this.containerEl.querySelector(`.${cls("graph-filter-row")}`);
		if (filterRow) {
			filterRow.addClass(cls("hidden"));
		}
		// Also explicitly hide the preset selector when hiding the filter row
		this.graphFilterPresetSelector?.hide();
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

		// Re-apply pre-fill filter when switching to a different file
		if (this.currentFile && file.path !== this.currentFile.path) {
			this.applyPreFillFilter();
		}

		this.currentFile = file;
		this.updateGraph();
	}

	private applyPreFillFilter(): void {
		if (!this.graphFilter) return;

		const settings = this.plugin.settingsStore.currentSettings;
		if (settings.preFillFilterPreset) {
			const preFillPreset = settings.filterPresets.find((preset) => preset.name === settings.preFillFilterPreset);
			if (preFillPreset) {
				this.graphFilter.setFilterValue(preFillPreset.expression);
			}
		}
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
				cls: cls("graph-empty-state"),
			});
		}
	}

	private updateGraph(): void {
		if (!this.currentFile || this.isUpdating) return;

		this.isUpdating = true;

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

		// If initialization failed, store the graph data and wait for container to become visible
		// The ResizeObserver will automatically render it when the view gets dimensions
		if (!this.cy) {
			this.pendingGraphData = { nodes, edges };
			this.isUpdating = false;
			return;
		}

		this.renderAndFitGraph(nodes, edges);
		this.pendingGraphData = null;
		this.isUpdating = false;
	}

	private destroyGraph(): void {
		if (this.zoomIndicator) {
			this.zoomIndicator.destroy();
			this.zoomIndicator = null;
		}

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
		if (this.cy) return;

		if (!this.graphContainerEl?.isConnected) {
			return;
		}

		const rect = this.graphContainerEl.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
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

		this.interactionHandler.setupInteractions();

		const settings = this.plugin.settingsStore.settings$.value;
		if (this.filterRowEl && settings.showZoomIndicator) {
			this.zoomIndicator = new ZoomIndicator(this.filterRowEl, this.cy);
		}
	}

	private renderGraph(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
		if (!this.cy) return;

		this.cy.add([...nodes, ...edges]);
		this.cy.edges().addClass("core");

		const settings = this.plugin.settingsStore.settings$.value;
		const animationDuration = settings.graphAnimationDuration;

		const isFolderNoteGraph = Boolean(this.currentFile && isFolderNote(this.currentFile.path));

		this.layoutManager.applyLayout(nodes, edges, {
			animationDuration,
			isFolderNote: isFolderNoteGraph,
			renderRelated: this.renderRelated,
			includeAllRelated: this.includeAllRelated,
			useMultiRowLayout: settings.useMultiRowLayout,
			maxChildrenPerRow: settings.maxChildrenPerRow,
		});
	}

	private renderAndFitGraph(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
		if (!this.cy) return;

		this.renderGraph(nodes, edges);
		this.cy.resize();
		this.cy.fit();
		this.cy.center();
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

	private createZoomPreview(el: HTMLElement, filePath: string): GraphZoomPreview | null {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return null;
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

	public centerOnSource(): void {
		if (!this.cy || !this.currentFile) return;

		const sourcePath = this.currentFile.path;
		const settings = this.plugin.settingsStore.settings$.value;

		if (this.zoomManager.isInZoomMode()) {
			this.focusOnNode(sourcePath);
		} else {
			const sourceNode = this.cy.nodes().filter((node) => node.data("isSource") === true);

			if (sourceNode.length > 0) {
				this.cy.animate({
					center: { eles: sourceNode },
					fit: { eles: this.cy.elements(), padding: 50 },
					duration: settings.graphAnimationDuration,
					easing: "ease-out",
				});
			} else {
				this.cy.fit();
				this.cy.center();
			}
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

	private renderNodeAsRoot(nodeId: string): void {
		if (!this.cy) return;

		const targetNode = this.cy.getElementById(nodeId);
		if (!targetNode.length) return;

		const nodesToKeep = new Set<string>([nodeId]);
		const visited = new Set<string>();

		const collectDescendants = (currentNodeId: string): void => {
			if (visited.has(currentNodeId)) return;
			visited.add(currentNodeId);

			const currentNode = this.cy!.getElementById(currentNodeId);
			if (!currentNode.length) return;

			// Get all outgoing edges (edges FROM this node to children)
			const outgoingEdges = currentNode.outgoers("edge");

			outgoingEdges.forEach((edge) => {
				const targetId = edge.target().id();
				// Add this child to nodes to keep
				nodesToKeep.add(targetId);
				// Recursively collect descendants of this child
				collectDescendants(targetId);
			});
		};

		collectDescendants(nodeId);

		this.cy.nodes().forEach((node) => {
			const nodeId = node.id();
			if (!nodesToKeep.has(nodeId)) {
				node.remove();
			}
		});

		this.cy.resize();
		this.cy.fit();
		this.cy.center();
	}

	public isRelatedView(): boolean {
		return this.renderRelated;
	}

	public isAllRelatedView(): boolean {
		return this.includeAllRelated;
	}

	public setViewTypeChangeCallback(callback: () => void): void {
		this.onViewTypeChangeCallback = callback;
	}

	private notifyViewTypeChange(): void {
		if (this.onViewTypeChangeCallback) {
			this.onViewTypeChangeCallback();
		}
	}

	public updateGraphWithDepth(depth: number): void {
		this.graphBuilder.setDepthOverride(depth);
		this.updateGraph();
	}
}
