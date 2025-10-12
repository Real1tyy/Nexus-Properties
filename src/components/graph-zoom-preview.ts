import type { App, TFile } from "obsidian";
import { formatPropertyValue } from "../utils/property-value-formatter";

export interface GraphZoomPreviewProps {
	file: TFile;
	onExit: () => void;
}

export class GraphZoomPreview {
	private previewOverlay: HTMLElement;
	private exitZoomCheckbox: HTMLInputElement | null = null;
	private exitZoomContainer: HTMLElement | null = null;

	constructor(
		private containerEl: HTMLElement,
		private app: App,
		private props: GraphZoomPreviewProps
	) {
		this.previewOverlay = this.containerEl.createEl("div", {
			cls: "nexus-graph-zoom-preview",
		});
		this.render();
	}

	private async render(): Promise<void> {
		// Exit zoom mode checkbox (top right)
		this.exitZoomContainer = this.previewOverlay.createEl("div", {
			cls: "nexus-graph-exit-zoom-container",
		});

		this.exitZoomCheckbox = this.exitZoomContainer.createEl("input", { type: "checkbox" });
		this.exitZoomCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.exitZoomCheckbox.checked = false;

		this.exitZoomContainer.createEl("label", {
			text: "Exit Zoom Mode",
			cls: "nexus-graph-toggle-label",
		});

		this.exitZoomCheckbox.addEventListener("change", () => {
			if (this.exitZoomCheckbox?.checked) {
				this.props.onExit();
			}
		});

		// Header section
		const headerSection = this.previewOverlay.createEl("div", {
			cls: "nexus-graph-zoom-preview-header",
		});

		// File name
		headerSection.createEl("h2", {
			text: this.props.file.basename,
			cls: "nexus-graph-zoom-preview-title",
		});

		// Frontmatter section
		const cache = this.app.metadataCache.getFileCache(this.props.file);
		const frontmatter = cache?.frontmatter;

		if (frontmatter) {
			const fmSection = this.previewOverlay.createEl("div", {
				cls: "nexus-graph-zoom-preview-frontmatter",
			});

			for (const [key, value] of Object.entries(frontmatter)) {
				// Skip internal Obsidian properties
				if (key === "position") continue;

				const propEl = fmSection.createEl("div", {
					cls: "nexus-graph-zoom-preview-property",
				});

				propEl.createEl("span", {
					text: key,
					cls: "nexus-graph-zoom-preview-property-key",
				});

				propEl.createEl("span", {
					text: formatPropertyValue(value),
					cls: "nexus-graph-zoom-preview-property-value",
				});
			}
		}

		// Content section (scrollable)
		const contentSection = this.previewOverlay.createEl("div", {
			cls: "nexus-graph-zoom-preview-content",
		});

		const content = await this.app.vault.read(this.props.file);
		// Remove frontmatter from content display
		const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, "");

		contentSection.createEl("div", {
			text: contentWithoutFrontmatter || "(No content)",
			cls: "nexus-graph-zoom-preview-content-text",
		});
	}

	destroy(): void {
		this.previewOverlay.remove();
		this.exitZoomCheckbox = null;
		this.exitZoomContainer = null;
	}
}
