import { type App, Component, MarkdownRenderer, type TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { SettingsStore } from "../core/settings-store";
import type { NexusPropertiesSettings } from "../types/settings";
import { filterPropertiesForDisplay } from "../utils/frontmatter-value";
import { PropertyRenderer } from "./property-renderer";

export interface GraphZoomPreviewProps {
	file: TFile;
	onExit: () => void;
	settingsStore: SettingsStore;
	initialHideFrontmatter: boolean;
	initialHideContent: boolean;
	onToggleStatesChange?: (hideFrontmatter: boolean, hideContent: boolean) => void;
}

export class GraphZoomPreview {
	private previewOverlay: HTMLElement;
	private controlsContainer: HTMLElement | null = null;
	private exitZoomCheckbox: HTMLInputElement | null = null;
	private hideFrontmatterCheckbox: HTMLInputElement | null = null;
	private hideContentCheckbox: HTMLInputElement | null = null;
	private frontmatterSection: HTMLElement | null = null;
	private contentSection: HTMLElement | null = null;
	private settings: NexusPropertiesSettings;
	private propertyRenderer: PropertyRenderer;
	private markdownComponent: Component;
	private settingsSubscription: Subscription | null = null;
	private bodyContainer: HTMLElement | null = null;

	constructor(
		private containerEl: HTMLElement,
		private app: App,
		private props: GraphZoomPreviewProps
	) {
		this.settings = props.settingsStore.currentSettings;
		this.markdownComponent = new Component();
		this.markdownComponent.load();
		this.propertyRenderer = new PropertyRenderer(
			this.app,
			this.props.file,
			{
				containerClass: "nexus-graph-zoom-preview-property",
				keyClass: "nexus-graph-zoom-preview-property-key",
				valueClass: "nexus-graph-zoom-preview-property-value",
				linkClass: "nexus-graph-zoom-preview-property-link",
				textClass: "nexus-graph-zoom-preview-property-text",
				emptyClass: "nexus-graph-zoom-preview-property-empty",
				separatorClass: "nexus-graph-zoom-preview-property-separator",
			},
			() => this.props.onExit()
		);
		this.previewOverlay = this.containerEl.createEl("div", {
			cls: "nexus-graph-zoom-preview",
		});
		// Apply custom height from settings using CSS variable
		this.previewOverlay.setCssProps({
			"--zoom-preview-max-height": `${this.settings.graphZoomPreviewHeight}px`,
		});

		// Subscribe to settings changes to update preview reactively
		this.settingsSubscription = this.props.settingsStore.settings$.subscribe((settings) => {
			this.settings = settings;
			// Update height CSS variable
			this.previewOverlay.setCssProps({
				"--zoom-preview-max-height": `${settings.graphZoomPreviewHeight}px`,
			});
			// Update checkbox states from settings
			if (this.hideFrontmatterCheckbox) {
				this.hideFrontmatterCheckbox.checked = settings.zoomHideFrontmatterByDefault;
				this.toggleFrontmatterVisibility();
			}
			if (this.hideContentCheckbox) {
				this.hideContentCheckbox.checked = settings.zoomHideContentByDefault;
				this.toggleContentVisibility();
			}
		});

		this.render();
	}

	private async render(): Promise<void> {
		// Controls container (flexbox with header and toggles)
		this.controlsContainer = this.previewOverlay.createEl("div", {
			cls: "nexus-graph-zoom-preview-controls",
		});

		// Clickable header (left side)
		const headerEl = this.controlsContainer.createEl("h2", {
			text: this.props.file.basename,
			cls: "nexus-graph-zoom-preview-title clickable",
		});

		headerEl.onclick = () => {
			this.app.workspace.openLinkText(this.props.file.path, "", false);
			this.props.onExit();
		};

		// Toggles container (right side)
		const togglesContainer = this.controlsContainer.createEl("div", {
			cls: "nexus-graph-zoom-preview-toggles",
		});

		// Hide Frontmatter toggle
		const hideFmContainer = togglesContainer.createEl("div", {
			cls: "nexus-graph-toggle-container",
		});

		this.hideFrontmatterCheckbox = hideFmContainer.createEl("input", { type: "checkbox" });
		this.hideFrontmatterCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.hideFrontmatterCheckbox.checked = this.props.initialHideFrontmatter ?? false;

		hideFmContainer.createEl("label", {
			text: "Hide Frontmatter",
			cls: "nexus-graph-toggle-label",
		});

		this.hideFrontmatterCheckbox.addEventListener("change", () => {
			this.toggleFrontmatterVisibility();
		});

		// Make entire container clickable
		hideFmContainer.addEventListener("click", (e) => {
			// Prevent double-triggering if checkbox itself was clicked
			if (e.target !== this.hideFrontmatterCheckbox) {
				this.hideFrontmatterCheckbox!.checked = !this.hideFrontmatterCheckbox!.checked;
				this.hideFrontmatterCheckbox!.dispatchEvent(new Event("change"));
			}
		});

		// Hide Content toggle
		const hideContentContainer = togglesContainer.createEl("div", {
			cls: "nexus-graph-toggle-container",
		});

		this.hideContentCheckbox = hideContentContainer.createEl("input", { type: "checkbox" });
		this.hideContentCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.hideContentCheckbox.checked = this.props.initialHideContent ?? false;

		hideContentContainer.createEl("label", {
			text: "Hide Content",
			cls: "nexus-graph-toggle-label",
		});

		this.hideContentCheckbox.addEventListener("change", () => {
			this.toggleContentVisibility();
		});

		// Make entire container clickable
		hideContentContainer.addEventListener("click", (e) => {
			// Prevent double-triggering if checkbox itself was clicked
			if (e.target !== this.hideContentCheckbox) {
				this.hideContentCheckbox!.checked = !this.hideContentCheckbox!.checked;
				this.hideContentCheckbox!.dispatchEvent(new Event("change"));
			}
		});

		// Exit Zoom Mode toggle
		const exitZoomContainer = togglesContainer.createEl("div", {
			cls: "nexus-graph-toggle-container",
		});

		this.exitZoomCheckbox = exitZoomContainer.createEl("input", { type: "checkbox" });
		this.exitZoomCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.exitZoomCheckbox.checked = false;

		exitZoomContainer.createEl("label", {
			text: "Exit Zoom Mode",
			cls: "nexus-graph-toggle-label",
		});

		this.exitZoomCheckbox.addEventListener("change", () => {
			if (this.exitZoomCheckbox?.checked) {
				this.props.onExit();
			}
		});

		// Make entire container clickable
		exitZoomContainer.addEventListener("click", (e) => {
			// Prevent double-triggering if checkbox itself was clicked
			if (e.target !== this.exitZoomCheckbox) {
				this.exitZoomCheckbox!.checked = !this.exitZoomCheckbox!.checked;
				this.exitZoomCheckbox!.dispatchEvent(new Event("change"));
			}
		});

		this.bodyContainer = this.previewOverlay.createEl("div", {
			cls: "nexus-graph-zoom-preview-body",
		});

		// Frontmatter section
		const cache = this.app.metadataCache.getFileCache(this.props.file);
		// biome-ignore lint/correctness/noUnusedVariables: Using rest operator to exclude position
		const { position, ...frontmatter } = cache?.frontmatter ?? {};

		this.frontmatterSection = this.bodyContainer.createEl("div", {
			cls: "nexus-graph-zoom-preview-frontmatter",
		});

		// Apply initial visibility state
		if (this.props.initialHideFrontmatter) {
			this.frontmatterSection.addClass("nexus-hidden");
		}

		if (Object.keys(frontmatter).length > 0) {
			const filteredProperties = filterPropertiesForDisplay(frontmatter, this.settings);

			for (const [key, value] of filteredProperties) {
				// Skip parent/child properties (visible in graph)
				if (key === this.settings.parentProp || key === this.settings.childrenProp) {
					continue;
				}

				this.propertyRenderer.renderProperty(this.frontmatterSection, key, value);
			}
		} else {
			this.frontmatterSection.createEl("p", {
				text: "No frontmatter properties found.",
				cls: "nexus-graph-zoom-preview-empty",
			});
		}

		// Content section (scrollable)
		this.contentSection = this.bodyContainer.createEl("div", {
			cls: "nexus-graph-zoom-preview-content",
		});

		// Apply initial visibility state
		if (this.props.initialHideContent) {
			this.contentSection.addClass("nexus-hidden");
		}

		const content = await this.app.vault.read(this.props.file);
		// Remove frontmatter from content display
		const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, "");

		// Render markdown content
		const contentTextEl = this.contentSection.createEl("div", {
			cls: "nexus-graph-zoom-preview-content-text",
		});

		if (contentWithoutFrontmatter) {
			await MarkdownRenderer.render(
				this.app,
				contentWithoutFrontmatter,
				contentTextEl,
				this.props.file.path,
				this.markdownComponent
			);
		} else {
			contentTextEl.createEl("p", {
				text: "(No content)",
				cls: "nexus-graph-zoom-preview-empty",
			});
		}

		this.updateBodyVisibility();
	}

	private toggleFrontmatterVisibility(): void {
		if (!this.frontmatterSection) return;

		const isHidden = this.hideFrontmatterCheckbox?.checked ?? false;
		this.frontmatterSection.toggleClass("nexus-hidden", isHidden);

		this.updateBodyVisibility();

		// Notify parent of state change
		this.props.onToggleStatesChange?.(
			this.hideFrontmatterCheckbox?.checked ?? false,
			this.hideContentCheckbox?.checked ?? false
		);
	}

	private toggleContentVisibility(): void {
		if (!this.contentSection) return;

		const isHidden = this.hideContentCheckbox?.checked ?? false;
		this.contentSection.toggleClass("nexus-hidden", isHidden);

		this.updateBodyVisibility();

		// Notify parent of state change
		this.props.onToggleStatesChange?.(
			this.hideFrontmatterCheckbox?.checked ?? false,
			this.hideContentCheckbox?.checked ?? false
		);
	}
	private setSectionHidden(section: HTMLElement | null, checkbox: HTMLInputElement | null, hidden: boolean): void {
		if (!section || !checkbox) return;
		checkbox.checked = hidden;
		section.toggleClass("nexus-hidden", hidden);
	}

	private updateBodyVisibility(): void {
		if (!this.bodyContainer) return;

		const bothHidden = (this.hideFrontmatterCheckbox?.checked ?? false) && (this.hideContentCheckbox?.checked ?? false);

		this.bodyContainer.toggleClass("nexus-hidden", bothHidden);
	}

	public setHideFrontmatter(hidden: boolean): void {
		this.setSectionHidden(this.frontmatterSection, this.hideFrontmatterCheckbox, hidden);
		this.updateBodyVisibility();
	}

	public setHideContent(hidden: boolean): void {
		this.setSectionHidden(this.contentSection, this.hideContentCheckbox, hidden);
		this.updateBodyVisibility();
	}

	destroy(): void {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		this.markdownComponent.unload();
		this.previewOverlay.remove();
		this.controlsContainer = null;
		this.exitZoomCheckbox = null;
		this.hideFrontmatterCheckbox = null;
		this.hideContentCheckbox = null;
		this.frontmatterSection = null;
		this.contentSection = null;
		this.bodyContainer = null;
	}
}
