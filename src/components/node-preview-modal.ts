import { type App, Modal, type TFile } from "obsidian";

export class NodePreviewModal extends Modal {
	private file: TFile;
	private frontmatter: Record<string, unknown> = {};

	constructor(app: App, file: TFile) {
		super(app);
		this.file = file;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass("node-preview-modal");

		await this.loadFrontmatter();
		this.renderPreview();
	}

	private async loadFrontmatter(): Promise<void> {
		try {
			const cache = this.app.metadataCache.getFileCache(this.file);
			if (cache?.frontmatter) {
				// Copy all frontmatter except Obsidian's internal properties
				// biome-ignore lint/correctness/noUnusedVariables: Using rest operator to exclude position
				const { position, ...userFrontmatter } = cache.frontmatter;
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
		const header = contentEl.createDiv("node-preview-header");
		const titleEl = header.createEl("h2", { text: this.file.basename });

		// Make title clickable to open file
		titleEl.addClass("clickable");
		titleEl.onclick = () => {
			this.app.workspace.openLinkText(this.file.path, "", false);
			this.close();
		};

		// Frontmatter section
		const section = contentEl.createDiv("node-preview-section");

		if (Object.keys(this.frontmatter).length === 0) {
			section.createEl("p", {
				text: "No frontmatter properties found.",
				cls: "node-preview-empty",
			});
			return;
		}

		section.createEl("h3", {
			text: "Frontmatter",
			cls: "node-preview-section-title",
		});

		const grid = section.createDiv("node-preview-props-grid");

		for (const [key, value] of Object.entries(this.frontmatter)) {
			this.renderProperty(grid, key, value);
		}
	}

	private renderProperty(container: HTMLElement, key: string, value: unknown): void {
		const propItem = container.createDiv("node-preview-prop-item");

		propItem.createEl("div", {
			text: key,
			cls: "node-preview-prop-key",
		});

		const valueEl = propItem.createEl("div", {
			cls: "node-preview-prop-value",
		});

		this.renderPropertyValue(valueEl, value);
	}

	private renderPropertyValue(container: HTMLElement, value: unknown): void {
		if (value === null || value === undefined) {
			container.createEl("span", {
				text: "—",
				cls: "node-preview-prop-empty",
			});
			return;
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				container.createEl("span", {
					text: "[ ]",
					cls: "node-preview-prop-empty",
				});
				return;
			}

			for (let i = 0; i < value.length; i++) {
				if (i > 0) {
					container.createEl("span", { text: ", ", cls: "node-preview-prop-separator" });
				}
				this.renderSingleValue(container, value[i]);
			}
			return;
		}

		this.renderSingleValue(container, value);
	}

	private renderSingleValue(container: HTMLElement, value: unknown): void {
		if (typeof value === "string") {
			// Check if it's a wiki link format [[path]] or [[path|alias]]
			const wikiLinkMatch = value.match(/^\[\[([^\]]+)\]\]$/);
			if (wikiLinkMatch) {
				const innerContent = wikiLinkMatch[1];
				const pipeIndex = innerContent.indexOf("|");

				const linkPath = pipeIndex !== -1 ? innerContent.substring(0, pipeIndex).trim() : innerContent.trim();

				const displayText = pipeIndex !== -1 ? innerContent.substring(pipeIndex + 1).trim() : linkPath;

				const link = container.createEl("a", {
					text: displayText,
					cls: "node-preview-prop-link",
				});

				link.onclick = (e) => {
					e.preventDefault();
					this.app.workspace.openLinkText(linkPath, this.file.path, false);
					this.close();
				};
				return;
			}
		}

		// Default: display as text
		const text = this.formatValue(value);
		container.createEl("span", { text, cls: "node-preview-prop-text" });
	}

	private formatValue(value: unknown): string {
		if (typeof value === "boolean") {
			return value ? "Yes" : "No";
		}

		if (typeof value === "number") {
			return value.toString();
		}

		if (typeof value === "object" && value !== null) {
			return JSON.stringify(value, null, 2);
		}

		return String(value);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
