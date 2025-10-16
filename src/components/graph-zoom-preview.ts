import { type App, Component, MarkdownRenderer, type TFile } from "obsidian";
import type { SettingsStore } from "../core/settings-store";
import type { NexusPropertiesSettings } from "../types/settings";
import { isEmptyValue } from "../utils/value-check-utils";
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
		// Apply custom height from settings
		this.previewOverlay.style.maxHeight = `${this.settings.graphZoomPreviewHeight}px`;
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

		// Frontmatter section
		const cache = this.app.metadataCache.getFileCache(this.props.file);
		// biome-ignore lint/correctness/noUnusedVariables: Using rest operator to exclude position
		const { position, ...frontmatter } = cache?.frontmatter ?? {};

		this.frontmatterSection = this.previewOverlay.createEl("div", {
			cls: "nexus-graph-zoom-preview-frontmatter",
		});

		// Apply initial visibility state
		if (this.props.initialHideFrontmatter) {
			this.frontmatterSection.style.display = "none";
		}

		if (Object.keys(frontmatter).length > 0) {
			for (const [key, value] of Object.entries(frontmatter)) {
				// Skip parent/child properties (visible in graph)
				if (key === this.settings.parentProp || key === this.settings.childrenProp) {
					continue;
				}

				// Skip underscore properties if configured
				if (this.settings.hideUnderscoreProperties && key.startsWith("_")) {
					continue;
				}

				// Skip empty properties if configured
				if (this.settings.hideEmptyProperties && isEmptyValue(value)) {
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
		this.contentSection = this.previewOverlay.createEl("div", {
			cls: "nexus-graph-zoom-preview-content",
		});

		// Apply initial visibility state
		if (this.props.initialHideContent) {
			this.contentSection.style.display = "none";
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
	}

	private toggleFrontmatterVisibility(): void {
		if (!this.frontmatterSection) return;

		const isHidden = this.hideFrontmatterCheckbox?.checked ?? false;
		this.frontmatterSection.style.display = isHidden ? "none" : "";

		// If both are hidden, show both
		if (isHidden && this.hideContentCheckbox?.checked) {
			if (this.hideContentCheckbox) {
				this.hideContentCheckbox.checked = false;
			}
			if (this.contentSection) {
				this.contentSection.style.display = "";
			}
		}

		// Notify parent of state change
		this.props.onToggleStatesChange?.(
			this.hideFrontmatterCheckbox?.checked ?? false,
			this.hideContentCheckbox?.checked ?? false
		);
	}

	private toggleContentVisibility(): void {
		if (!this.contentSection) return;

		const isHidden = this.hideContentCheckbox?.checked ?? false;
		this.contentSection.style.display = isHidden ? "none" : "";

		// If both are hidden, show both
		if (isHidden && this.hideFrontmatterCheckbox?.checked) {
			if (this.hideFrontmatterCheckbox) {
				this.hideFrontmatterCheckbox.checked = false;
			}
			if (this.frontmatterSection) {
				this.frontmatterSection.style.display = "";
			}
		}

		// Notify parent of state change
		this.props.onToggleStatesChange?.(
			this.hideFrontmatterCheckbox?.checked ?? false,
			this.hideContentCheckbox?.checked ?? false
		);
	}

	destroy(): void {
		this.markdownComponent.unload();
		this.previewOverlay.remove();
		this.controlsContainer = null;
		this.exitZoomCheckbox = null;
		this.hideFrontmatterCheckbox = null;
		this.hideContentCheckbox = null;
		this.frontmatterSection = null;
		this.contentSection = null;
	}
}
