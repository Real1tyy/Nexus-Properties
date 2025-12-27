import { ItemView, Platform, type WorkspaceLeaf } from "obsidian";
import type { Subscription } from "rxjs";
import type { Indexer } from "../../core/indexer";
import type NexusPropertiesPlugin from "../../main";
import { cls } from "../../utils/css";
import { BasesView, type BaseViewType } from "./bases-view";
import { RelationshipGraphView } from "./relationship-graph-view";

export const VIEW_TYPE_NEXUS_SWITCHER = "nexus-view-switcher";

type ViewMode = "graph" | "bases";

export class NexusViewSwitcher extends ItemView {
	private currentMode: ViewMode = "graph";
	private graphView: RelationshipGraphView | null = null;
	private basesView: BasesView | null = null;
	private toggleButton: HTMLButtonElement | null = null;
	private basesContentEl: HTMLElement | null = null;
	private graphContainerEl: HTMLElement | null = null;
	private isEnlarged = false;
	private originalWidth: number | null = null;
	private settingsSubscription: Subscription | null = null;
	private lastBasesViewType: BaseViewType = "children";

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
		return this.currentMode === "graph" ? "git-fork" : "layout-grid";
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls("view-switcher-content"));

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe(async (settings) => {
			await this.handleSettingsChange(settings.showViewSwitcherHeader);
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", async () => {
				if (this.currentMode === "bases" && this.basesView) {
					await this.basesView.updateActiveFile();
				}
			})
		);

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

		if (this.basesContentEl) {
			this.basesContentEl.empty();
			this.basesContentEl = null;
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
	 * Toggle between graph and bases views
	 */
	async toggleView(): Promise<void> {
		const newMode: ViewMode = this.currentMode === "graph" ? "bases" : "graph";
		this.currentMode = newMode;

		// Update button text
		if (this.toggleButton) {
			this.toggleButton.textContent = this.currentMode === "graph" ? "Switch to Bases View" : "Switch to Graph View";
		}

		await this.renderViewContent();
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

			this.toggleButton = headerBar.createEl("button", {
				text: this.currentMode === "graph" ? "Switch to Bases View" : "Switch to Graph View",
				cls: cls("view-toggle-button"),
			});

			this.toggleButton.addEventListener("click", async () => {
				await this.toggleView();
			});
		}

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

		if (this.currentMode === "graph") {
			// Clean up bases view
			if (this.basesContentEl) {
				this.basesContentEl = null;
			}

			// Create graph container
			this.graphContainerEl = contentEl.createEl("div", {
				cls: cls("graph-container"),
			});

			// Create and render graph view
			this.graphView = new RelationshipGraphView(this.app, this.indexer, this.plugin, this.graphContainerEl);

			await this.graphView.render();
		} else {
			// Clean up graph view
			if (this.graphView) {
				this.graphView.destroy();
				this.graphView = null;
			}
			if (this.graphContainerEl) {
				this.graphContainerEl = null;
			}

			// Create bases container
			this.basesContentEl = contentEl.createEl("div", {
				cls: cls("bases-view-content"),
			});

			this.basesView = new BasesView(this.app, this.basesContentEl, this.plugin, this.lastBasesViewType, (viewType) => {
				this.lastBasesViewType = viewType;
			});

			await this.basesView.render();
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
}
