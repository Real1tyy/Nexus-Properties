import type { App, TFile } from "obsidian";
import { formatValue, parseWikiLink } from "../utils/frontmatter-value-utils";

export interface PropertyRendererOptions {
	containerClass: string;
	keyClass: string;
	valueClass: string;
	linkClass: string;
	textClass: string;
	emptyClass: string;
	separatorClass: string;
}

export class PropertyRenderer {
	constructor(
		private app: App,
		private file: TFile,
		private options: PropertyRendererOptions,
		private onLinkClick?: () => void
	) {}

	renderProperty(container: HTMLElement, key: string, value: unknown): void {
		const propEl = container.createEl("div", {
			cls: this.options.containerClass,
		});

		propEl.createEl("span", {
			text: key,
			cls: this.options.keyClass,
		});

		const valueEl = propEl.createEl("div", {
			cls: this.options.valueClass,
		});

		this.renderPropertyValue(valueEl, value);
	}

	private renderPropertyValue(container: HTMLElement, value: unknown): void {
		if (value === null || value === undefined) {
			container.createEl("span", {
				text: "—",
				cls: this.options.emptyClass,
			});
			return;
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				container.createEl("span", {
					text: "[ ]",
					cls: this.options.emptyClass,
				});
				return;
			}

			for (let i = 0; i < value.length; i++) {
				if (i > 0) {
					container.createEl("span", { text: ", ", cls: this.options.separatorClass });
				}
				this.renderSingleValue(container, value[i]);
			}
			return;
		}

		this.renderSingleValue(container, value);
	}

	private renderSingleValue(container: HTMLElement, value: unknown): void {
		if (typeof value === "string") {
			const wikiLink = parseWikiLink(value);
			if (wikiLink) {
				const link = container.createEl("a", {
					text: wikiLink.displayText,
					cls: this.options.linkClass,
				});

				link.onclick = (e) => {
					e.preventDefault();
					this.app.workspace.openLinkText(wikiLink.linkPath, this.file.path, false);
					this.onLinkClick?.();
				};
				return;
			}
		}

		// Default: display as text
		const text = formatValue(value);
		container.createEl("span", { text, cls: this.options.textClass });
	}
}
