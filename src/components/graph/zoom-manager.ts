import type { Core } from "cytoscape";
import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { SettingsStore } from "../../core/settings-store";
import type { GraphZoomPreview } from "./zoom-preview";

interface ZoomConfig {
	getCy: () => Core;
	getPreviewWrapperEl: () => HTMLElement;
	settingsStore: SettingsStore;
	onToggleStatesChange: (hideFrontmatter: boolean, hideContent: boolean) => void;
}

export class GraphZoomManager {
	private isZoomMode = false;
	private focusedNodeId: string | null = null;
	private zoomPreview: GraphZoomPreview | null = null;
	private previewHideFrontmatter = false;
	private previewHideContent = false;
	private suppressNextResizeFit = false;

	constructor(
		private readonly app: App,
		private readonly config: ZoomConfig
	) {
		// Initialize preview hide states from settings
		const current = config.settingsStore.settings$.value;
		this.previewHideFrontmatter = current.zoomHideFrontmatterByDefault;
		this.previewHideContent = current.zoomHideContentByDefault;
	}

	private get cy(): Core {
		return this.config.getCy();
	}

	isInZoomMode(): boolean {
		return this.isZoomMode;
	}

	getFocusedNodeId(): string | null {
		return this.focusedNodeId;
	}

	getFrontmatterHideState(): boolean {
		return this.previewHideFrontmatter;
	}

	getContentHideState(): boolean {
		return this.previewHideContent;
	}

	updateHideStates(hideFrontmatter: boolean, hideContent: boolean): void {
		this.previewHideFrontmatter = hideFrontmatter;
		this.previewHideContent = hideContent;
	}

	/**
	 * Clears the suppression flag after reading it once.
	 */
	shouldSuppressNextResizeFit(): boolean {
		const value = this.suppressNextResizeFit;
		if (this.suppressNextResizeFit) {
			this.suppressNextResizeFit = false;
		}
		return value;
	}

	enterZoomMode(filePath: string, createPreview: (el: HTMLElement) => GraphZoomPreview): void {
		this.isZoomMode = true;
		this.focusOnNode(filePath, createPreview);
	}

	exitZoomMode(): void {
		this.isZoomMode = false;
		this.focusedNodeId = null;

		// Stop animations and remove focused class
		this.cy.stop();
		this.cy.nodes().removeClass("focused");

		this.hidePreviewOverlay();

		// Reset zoom to show full graph
		this.suppressNextResizeFit = true;
		requestAnimationFrame(() => {
			this.cy.resize();
			this.cy.fit();
			this.cy.center();
		});
	}

	focusOnNode(filePath: string, createPreview: (el: HTMLElement) => GraphZoomPreview): void {
		this.focusedNodeId = filePath;
		const file = this.app.vault.getAbstractFileByPath(filePath);

		if (!(file instanceof TFile)) return;

		// Zoom to the focused node
		this.cy.nodes().removeClass("focused");

		const node = this.cy.nodes().filter((n) => n.id() === filePath);
		if (node.length > 0) {
			node.addClass("focused");

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
		this.showPreviewOverlay(createPreview);
	}

	centerOnFocusedNode(): void {
		if (!this.isZoomMode || !this.focusedNodeId) return;

		const node = this.cy.nodes().filter((n) => n.id() === this.focusedNodeId);
		if (node.length > 0) {
			(this.cy as any).center(node);
		}
	}

	toggleHideContent(): void {
		this.previewHideContent = !this.previewHideContent;
		if (this.zoomPreview) {
			this.zoomPreview.setHideContent(this.previewHideContent);
		}
	}

	toggleHideFrontmatter(): void {
		this.previewHideFrontmatter = !this.previewHideFrontmatter;
		if (this.zoomPreview) {
			this.zoomPreview.setHideFrontmatter(this.previewHideFrontmatter);
		}
	}

	private showPreviewOverlay(createPreview: (el: HTMLElement) => GraphZoomPreview): void {
		this.hidePreviewOverlay();

		this.zoomPreview = createPreview(this.config.getPreviewWrapperEl());
	}

	private hidePreviewOverlay(): void {
		if (this.zoomPreview) {
			this.zoomPreview.destroy();
			this.zoomPreview = null;
		}
	}

	cleanup(): void {
		this.hidePreviewOverlay();
	}
}
