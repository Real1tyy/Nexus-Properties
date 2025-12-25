import { filterPropertiesForDisplay } from "@real1ty-obsidian-plugins/utils";
import { type App, Modal, type TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { SettingsStore } from "../core/settings-store";
import type { NexusPropertiesSettings } from "../types/settings";
import { cls } from "../utils/css";
import { PropertyRenderer } from "./property-renderer";

export class NodePreviewModal extends Modal {
	private file: TFile;
	private frontmatter: Record<string, unknown> = {};
	private settings: NexusPropertiesSettings;
	private settingsSubscription?: Subscription;
	private propertyRenderer: PropertyRenderer;

	constructor(
		app: App,
		file: TFile,
		private settingsStore: SettingsStore
	) {
		super(app);
		this.file = file;
		this.settings = settingsStore.currentSettings;
		this.propertyRenderer = new PropertyRenderer(
			this.app,
			this.file,
			{
				containerClass: cls("node-preview-prop-item"),
				keyClass: cls("node-preview-prop-key"),
				valueClass: cls("node-preview-prop-value"),
				linkClass: cls("node-preview-prop-link"),
				textClass: cls("node-preview-prop-text"),
				emptyClass: cls("node-preview-prop-empty"),
				separatorClass: cls("node-preview-prop-separator"),
			},
			() => this.close()
		);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass(cls("node-preview-modal"));

		await this.loadFrontmatter();
		this.renderPreview();

		this.settingsSubscription = this.settingsStore.settings$.subscribe((newSettings) => {
			this.settings = newSettings;
			this.renderPreview();
		});
	}

	private async loadFrontmatter(): Promise<void> {
		try {
			const cache = this.app.metadataCache.getFileCache(this.file);
			if (cache?.frontmatter) {
				// Copy all frontmatter except Obsidian's internal properties
				const { position: _position, ...userFrontmatter } = cache.frontmatter;
				this.frontmatter = userFrontmatter;
			}
		} catch (error) {
			console.error("Error loading frontmatter:", error);
		}
	}

	private renderPreview(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Header with file name
		const header = contentEl.createDiv(cls("node-preview-header"));
		const titleEl = header.createEl("h2", { text: this.file.basename });

		// Make title clickable to open file
		titleEl.addClass("clickable");
		titleEl.onclick = () => {
			this.app.workspace.openLinkText(this.file.path, "", false);
			this.close();
		};

		// Frontmatter section
		const section = contentEl.createDiv(cls("node-preview-section"));

		if (Object.keys(this.frontmatter).length === 0) {
			section.createEl("p", {
				text: "No frontmatter properties found.",
				cls: cls("node-preview-empty"),
			});
			return;
		}

		section.createEl("h3", {
			text: "Frontmatter",
			cls: cls("node-preview-section-title"),
		});

		const grid = section.createDiv(cls("node-preview-props-grid"));

		const filteredProperties = filterPropertiesForDisplay(this.frontmatter, this.settings);

		for (const [key, value] of filteredProperties) {
			this.propertyRenderer.renderProperty(grid, key, value);
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Unsubscribe from settings changes
		this.settingsSubscription?.unsubscribe();
	}
}
