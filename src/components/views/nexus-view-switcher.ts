import { ItemView, Platform, type TFile, type WorkspaceLeaf } from "obsidian";
import type { Subscription } from "rxjs";
import { HierarchyProvider, type HierarchySourceType } from "../../core/hierarchy";
import type { Indexer } from "../../core/indexer";
import type NexusPropertiesPlugin from "../../main";
import type { NodeStatistics } from "../../types/statistics";
import { cls } from "../../utils/css";
import { collectRelatedNodesRecursively } from "../../utils/hierarchy";
import { detectValidMocContent } from "../../utils/moc-parser";
import { BasesView, type BaseViewType } from "./bases-view";
import { MocView } from "./moc-view";
import { RelationshipGraphView } from "./relationship-graph-view";

export const VIEW_TYPE_NEXUS_SWITCHER = "nexus-view-switcher";

type ViewMode = "graph" | "bases" | "moc";

export class NexusViewSwitcher extends ItemView {
	private currentMode: ViewMode = "graph";
	private graphView: RelationshipGraphView | null = null;
	private basesView: BasesView | null = null;
	private mocView: MocView | null = null;
	private mocContentEl: HTMLElement | null = null;
	private toggleButton: HTMLButtonElement | null = null;
	private archivedToggleContainer: HTMLElement | null = null;
	private archivedCheckbox: HTMLInputElement | null = null;
	private depthSliderContainer: HTMLElement | null = null;
	private depthSlider: HTMLInputElement | null = null;
	private depthValueLabel: HTMLElement | null = null;
	private statsContainer: HTMLElement | null = null;
	private basesContentEl: HTMLElement | null = null;
	private graphContainerEl: HTMLElement | null = null;
	private isEnlarged = false;
	private originalWidth: number | null = null;
	private settingsSubscription: Subscription | null = null;
	private lastBasesViewType: BaseViewType = "children";
	private showArchived = false;
	private temporaryDepthOverride: number | null = null;
	private currentHierarchySource: HierarchySourceType = "properties";
	private hierarchySourceButton: HTMLButtonElement | null = null;
	private hasValidMocContent = false;
	private lastCheckedFilePath: string | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly indexer: Indexer,
		private readonly plugin: NexusPropertiesPlugin
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_NEXUS_SWITCHER;
	}

	getDisplayText(): string {
		return "Nexus Properties";
	}

	getIcon(): string {
		switch (this.currentMode) {
			case "graph":
				return "git-fork";
			case "bases":
				return "layout-grid";
			case "moc":
				return "list-tree";
		}
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls("view-switcher-content"));

		this.currentHierarchySource = this.plugin.settingsStore.currentSettings.hierarchySource;

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe(async (settings) => {
			await this.handleSettingsChange(settings.showViewSwitcherHeader);
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", async () => {
				if (this.currentMode === "bases" && this.basesView) {
					await this.basesView.updateActiveFile();
				}
				if (this.currentMode === "moc" && this.mocView) {
					await this.mocView.updateActiveFile();
				}
				await this.checkMocContent();
				await this.updateStatistics();
			})
		);

		await this.checkMocContent();
		await this.renderView();
	}

	async onClose(): Promise<void> {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		if (this.graphView) {
			this.graphView.destroy();
			this.graphView = null;
		}

		if (this.basesView) {
			this.basesView.destroy();
			this.basesView = null;
		}

		if (this.mocView) {
			this.mocView.destroy();
			this.mocView = null;
		}

		if (this.basesContentEl) {
			this.basesContentEl.empty();
			this.basesContentEl = null;
		}

		if (this.mocContentEl) {
			this.mocContentEl.empty();
			this.mocContentEl = null;
		}

		if (this.graphContainerEl) {
			this.graphContainerEl = null;
		}
	}

	private async handleSettingsChange(showHeader: boolean): Promise<void> {
		const { contentEl } = this;
		const headerBar = contentEl.querySelector(`.${cls("view-switcher-header")}`);

		if (showHeader && !headerBar) {
			await this.renderView();
		} else if (!showHeader && headerBar) {
			headerBar.remove();
			this.toggleButton = null;
		}
	}

	/**
	 * Toggle between graph, bases, and moc views
	 */
	async toggleView(): Promise<void> {
		const modes: ViewMode[] = ["graph", "bases", "moc"];
		const currentIndex = modes.indexOf(this.currentMode);
		const nextIndex = (currentIndex + 1) % modes.length;
		this.currentMode = modes[nextIndex];

		// Update button text
		if (this.toggleButton) {
			this.toggleButton.textContent = this.getToggleButtonText();
		}

		this.updateArchivedToggleVisibility();
		await this.renderViewContent();
	}

	private getToggleButtonText(): string {
		switch (this.currentMode) {
			case "graph":
				return "Switch to Bases";
			case "bases":
				return "Switch to MOC";
			case "moc":
				return "Switch to Graph";
		}
	}

	private getHierarchySourceButtonText(): string {
		return this.currentHierarchySource === "properties" ? "Switch to MOC" : "Switch to Properties";
	}

	private async toggleHierarchySource(): Promise<void> {
		this.currentHierarchySource = this.currentHierarchySource === "properties" ? "moc-content" : "properties";

		if (this.hierarchySourceButton) {
			this.hierarchySourceButton.textContent = this.getHierarchySourceButtonText();
		}

		// Update statistics to reflect the new hierarchy source
		await this.updateStatistics();

		await this.renderViewContent();
	}

	private updateHierarchySourceButtonVisibility(): void {
		if (!this.hierarchySourceButton) return;

		const settings = this.plugin.settingsStore.settings$.value;
		const shouldShow = settings.enableMocContentReading && this.hasValidMocContent;

		this.hierarchySourceButton.style.display = shouldShow ? "block" : "none";

		// If MOC content is not available but we were in MOC mode, switch back to properties
		if (!shouldShow && this.currentHierarchySource === "moc-content") {
			this.currentHierarchySource = "properties";
		}
	}

	private async checkMocContent(): Promise<void> {
		const settings = this.plugin.settingsStore.settings$.value;
		const activeFile = this.app.workspace.getActiveFile();

		// If MOC content reading is disabled, don't check
		if (!settings.enableMocContentReading || !activeFile) {
			this.hasValidMocContent = false;
			this.updateHierarchySourceButtonVisibility();
			return;
		}

		// Skip if we already checked this file
		if (this.lastCheckedFilePath === activeFile.path) {
			return;
		}

		this.lastCheckedFilePath = activeFile.path;

		try {
			const content = await this.app.vault.read(activeFile);
			this.hasValidMocContent = detectValidMocContent(content);
		} catch {
			this.hasValidMocContent = false;
		}

		this.updateHierarchySourceButtonVisibility();

		// If we detected valid MOC content and the default is MOC, use it
		// Otherwise, use properties
		if (this.hasValidMocContent && settings.hierarchySource === "moc-content") {
			this.currentHierarchySource = "moc-content";
		} else if (!this.hasValidMocContent) {
			this.currentHierarchySource = "properties";
		}

		if (this.hierarchySourceButton) {
			this.hierarchySourceButton.textContent = this.getHierarchySourceButtonText();
		}
	}

	private updateArchivedToggleVisibility(): void {
		if (this.archivedToggleContainer) {
			if (this.currentMode === "bases") {
				this.archivedToggleContainer.style.display = "flex";
			} else {
				this.archivedToggleContainer.style.display = "none";
			}
		}

		if (this.depthSliderContainer) {
			const settings = this.plugin.settingsStore.settings$.value;
			if (this.currentMode === "graph" && settings.showDepthSlider) {
				this.depthSliderContainer.style.display = "flex";
			} else {
				this.depthSliderContainer.style.display = "none";
			}
		}
	}

	private async renderView(): Promise<void> {
		const { contentEl } = this;
		const settings = this.plugin.settingsStore.settings$.value;

		Array.from(contentEl.children).forEach((child) => {
			child.remove();
		});

		if (settings.showViewSwitcherHeader) {
			const headerBar = contentEl.createEl("div", {
				cls: cls("view-switcher-header"),
			});

			// Left side: Statistics
			this.statsContainer = headerBar.createEl("div", {
				cls: cls("view-switcher-stats"),
			});
			await this.updateStatistics();

			// Center: Buttons container (hierarchy source + view toggle)
			const buttonsContainer = headerBar.createEl("div", {
				cls: cls("view-switcher-buttons"),
			});

			// Hierarchy source toggle button (only shown when MOC content is detected)
			this.hierarchySourceButton = buttonsContainer.createEl("button", {
				text: this.getHierarchySourceButtonText(),
				cls: cls("hierarchy-source-button"),
			});

			this.hierarchySourceButton.addEventListener("click", async () => {
				await this.toggleHierarchySource();
			});

			this.updateHierarchySourceButtonVisibility();

			// View toggle button
			this.toggleButton = buttonsContainer.createEl("button", {
				text: this.getToggleButtonText(),
				cls: cls("view-toggle-button"),
			});

			this.toggleButton.addEventListener("click", async () => {
				await this.toggleView();
			});

			// Right side: Archived toggle
			if (settings.excludeArchived) {
				this.archivedToggleContainer = headerBar.createEl("label", {
					cls: cls("view-switcher-archived-toggle"),
				});

				this.archivedCheckbox = this.archivedToggleContainer.createEl("input", {
					type: "checkbox",
					cls: cls("view-switcher-archived-checkbox"),
				});
				this.archivedCheckbox.checked = this.showArchived;

				this.archivedToggleContainer.createSpan({
					text: "Archived",
					cls: cls("view-switcher-archived-label"),
				});

				this.archivedCheckbox.addEventListener("change", async () => {
					this.showArchived = this.archivedCheckbox!.checked;
					await this.renderViewContent();
				});
			}

			// Right side: Depth slider (for graph mode)
			if (settings.showDepthSlider) {
				this.depthSliderContainer = headerBar.createEl("div", {
					cls: cls("view-switcher-depth-slider"),
				});

				this.depthSliderContainer.createSpan({
					text: "Depth:",
					cls: cls("view-switcher-depth-label"),
				});

				this.depthSlider = this.depthSliderContainer.createEl("input", {
					type: "range",
					cls: cls("view-switcher-depth-input"),
				});
				this.depthSlider.min = "1";
				this.depthSlider.max = "50";

				this.depthValueLabel = this.depthSliderContainer.createSpan({
					text: "",
					cls: cls("view-switcher-depth-value"),
				});

				this.depthSlider.addEventListener("input", async () => {
					await this.handleDepthChange();
				});

				this.updateDepthSlider();
			}
		}

		this.updateArchivedToggleVisibility();
		await this.renderViewContent();
	}

	/**
	 * Render only the view content based on current mode
	 */
	private async renderViewContent(): Promise<void> {
		const { contentEl } = this;

		// Keep the header if it exists, clear the rest
		const headerBar = contentEl.querySelector(`.${cls("view-switcher-header")}`);
		Array.from(contentEl.children).forEach((child) => {
			if (child !== headerBar) {
				child.remove();
			}
		});

		// Clean up all views first
		this.cleanupViews();

		if (this.currentMode === "graph") {
			// Create graph container
			this.graphContainerEl = contentEl.createEl("div", {
				cls: cls("graph-container"),
			});

			// Create and render graph view
			this.graphView = new RelationshipGraphView(
				this.app,
				this.indexer,
				this.plugin,
				this.graphContainerEl,
				this.currentHierarchySource
			);

			this.graphView.setViewTypeChangeCallback(() => {
				this.updateDepthSlider();
			});

			await this.graphView.render();
		} else if (this.currentMode === "bases") {
			// Create bases container
			this.basesContentEl = contentEl.createEl("div", {
				cls: cls("bases-view-content"),
			});

			this.basesView = new BasesView(
				this.app,
				this.basesContentEl,
				this.plugin,
				this.lastBasesViewType,
				this.showArchived,
				this.currentHierarchySource,
				(viewType) => {
					this.lastBasesViewType = viewType;
				}
			);

			await this.basesView.render();
		} else if (this.currentMode === "moc") {
			// Create MOC container
			this.mocContentEl = contentEl.createEl("div", {
				cls: cls("moc-view-content"),
			});

			this.mocView = new MocView(this.app, this.mocContentEl, this.plugin, this.indexer, this.currentHierarchySource);

			await this.mocView.render();
		}
	}

	private cleanupViews(): void {
		if (this.graphView) {
			this.graphView.destroy();
			this.graphView = null;
		}
		if (this.graphContainerEl) {
			this.graphContainerEl = null;
		}
		if (this.basesView) {
			this.basesView.destroy();
			this.basesView = null;
		}
		if (this.basesContentEl) {
			this.basesContentEl = null;
		}
		if (this.mocView) {
			this.mocView.destroy();
			this.mocView = null;
		}
		if (this.mocContentEl) {
			this.mocContentEl = null;
		}
	}

	/**
	 * Get the current view mode
	 */
	getCurrentMode(): ViewMode {
		return this.currentMode;
	}

	/**
	 * Get the active graph view instance (if in graph mode)
	 */
	getGraphView(): RelationshipGraphView | null {
		return this.currentMode === "graph" ? this.graphView : null;
	}

	/**
	 * Get the active bases view instance (if in bases mode)
	 */
	getBasesView(): BasesView | null {
		return this.currentMode === "bases" ? this.basesView : null;
	}

	/**
	 * Navigate bases view forward
	 */
	async toggleBasesViewForward(): Promise<void> {
		await this.basesView?.toggleViewForward();
	}

	/**
	 * Navigate bases view backward
	 */
	async toggleBasesViewBackward(): Promise<void> {
		await this.basesView?.toggleViewBackward();
	}

	/**
	 * Go to bases view by index
	 */
	async goToBasesViewByIndex(index: number): Promise<void> {
		await this.basesView?.goToViewByIndex(index);
	}

	/**
	 * Toggle enlargement of the view (expand/collapse sidebar)
	 */
	toggleEnlargement(): void {
		if (Platform.isMobile) {
			return;
		}

		// Find the current view's leaf
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_NEXUS_SWITCHER);
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

		// Trigger a resize event to update any content that needs it
		window.dispatchEvent(new Event("resize"));
	}

	private createEmptyStatistics(): NodeStatistics {
		return {
			parents: 0,
			children: 0,
			related: 0,
			allParents: new Set(),
			allChildren: new Set(),
			allRelated: new Set(),
		};
	}

	public calculatePropertiesNodeStatistics(file: TFile): NodeStatistics {
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) {
			return this.createEmptyStatistics();
		}

		const currentDepth = this.getCurrentDepth();
		const relationships = this.indexer.extractRelationships(file, frontmatter);

		const parents = relationships.parent.length;
		const children = relationships.children.length;
		const related = relationships.related.length;

		const allParents = collectRelatedNodesRecursively(this.app, this.indexer, file, "parent", {
			maxDepth: currentDepth,
		});
		const allChildren = collectRelatedNodesRecursively(this.app, this.indexer, file, "children", {
			maxDepth: currentDepth,
		});
		const allRelated = collectRelatedNodesRecursively(this.app, this.indexer, file, "related", {
			maxDepth: currentDepth,
		});

		return {
			parents,
			children,
			related,
			allParents,
			allChildren,
			allRelated,
		};
	}

	public async calculateMocNodeStatistics(file: TFile): Promise<NodeStatistics> {
		if (this.currentHierarchySource === "properties") {
			return this.calculatePropertiesNodeStatistics(file);
		}

		const provider = HierarchyProvider.getInstance(this.app, this.indexer, this.plugin.settingsStore);
		const currentDepth = this.getCurrentDepth();
		const mocFilePath = file.path;

		const allChildren = await provider.collectRelatedNodesRecursively(file, "children", "moc-content", {
			maxDepth: currentDepth,
			mocFilePath,
		});

		const directChildren = await provider.findChildren(file.path, "moc-content", mocFilePath);
		const stats = this.createEmptyStatistics();
		stats.children = directChildren.length;
		stats.allChildren = allChildren;
		return stats;
	}

	private getCurrentDepth(): number {
		const settings = this.plugin.settingsStore.settings$.value;

		// If there's a temporary override, use it
		if (this.temporaryDepthOverride !== null) {
			return this.temporaryDepthOverride;
		}

		if (this.graphView) {
			const isRelatedView = this.graphView.isRelatedView?.() ?? false;
			const isAllRelated = this.graphView.isAllRelatedView?.() ?? false;

			if (isRelatedView && isAllRelated) {
				return settings.allRelatedMaxDepth;
			}
		}
		return settings.hierarchyMaxDepth;
	}

	private updateDepthSlider(): void {
		if (!this.depthSlider || !this.depthValueLabel) return;

		const currentDepth = this.getCurrentDepth();
		this.depthSlider.value = currentDepth.toString();
		this.depthValueLabel.textContent = currentDepth.toString();

		// Reset temporary override when view type changes
		this.temporaryDepthOverride = null;
	}

	private async handleDepthChange(): Promise<void> {
		if (!this.depthSlider || !this.depthValueLabel) return;

		const newDepth = Number.parseInt(this.depthSlider.value, 10);
		this.depthValueLabel.textContent = newDepth.toString();
		this.temporaryDepthOverride = newDepth;
		await this.updateStatistics();

		if (this.graphView) {
			this.graphView.updateGraphWithDepth(newDepth);
		}
	}

	private async updateStatistics(): Promise<void> {
		if (!this.statsContainer) return;

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.statsContainer.empty();
			return;
		}

		if (this.currentHierarchySource === "moc-content") {
			const stats = await this.calculateMocNodeStatistics(activeFile);
			this.renderStatistics(stats, true);
		} else {
			const stats = this.calculatePropertiesNodeStatistics(activeFile);
			this.renderStatistics(stats, false);
		}
	}

	private renderStatistics(stats: NodeStatistics, isMocContentMode: boolean): void {
		if (!this.statsContainer) return;

		const settings = this.plugin.settingsStore.settings$.value;
		this.statsContainer.empty();

		if (settings.showSimpleStatistics) {
			const directStatsCol = this.statsContainer.createDiv({
				cls: cls("view-switcher-stats-column"),
			});

			// Only show Parents and Related when NOT in MOC content mode
			if (!isMocContentMode) {
				directStatsCol.createEl("div", {
					text: `Parents: ${stats.parents}`,
					cls: cls("view-switcher-stat-item"),
				});
			}

			directStatsCol.createEl("div", {
				text: `Children: ${stats.children}`,
				cls: cls("view-switcher-stat-item"),
			});

			if (!isMocContentMode) {
				directStatsCol.createEl("div", {
					text: `Related: ${stats.related}`,
					cls: cls("view-switcher-stat-item"),
				});
			}
		}

		if (settings.showRecursiveStatistics) {
			const allStatsCol = this.statsContainer.createDiv({
				cls: cls("view-switcher-stats-column"),
			});

			// Only show All Parents and All Related when NOT in MOC content mode
			if (!isMocContentMode) {
				allStatsCol.createEl("div", {
					text: `All Parents: ${stats.allParents.size}`,
					cls: cls("view-switcher-stat-item"),
				});
			}

			allStatsCol.createEl("div", {
				text: `All Children: ${stats.allChildren.size}`,
				cls: cls("view-switcher-stat-item"),
			});

			if (!isMocContentMode) {
				allStatsCol.createEl("div", {
					text: `All Related: ${stats.allRelated.size}`,
					cls: cls("view-switcher-stat-item"),
				});
			}
		}
	}
}
