import { type App, Component, MarkdownRenderer } from "obsidian";
import { RegisteredEventsComponent } from "./component";

export const VIEW_TYPE_BASES = "nexus-bases-view";

/**
 * Bases view component that uses Obsidian's Bases API to render
 * Children, Parent, and Related files using native base code blocks
 */
export class BasesView extends RegisteredEventsComponent {
	private app: App;
	private contentEl: HTMLElement;
	private component: Component;

	constructor(app: App, containerEl: HTMLElement) {
		super();
		this.app = app;
		this.contentEl = containerEl;
		this.component = new Component();
		this.component.load();
	}

	async render(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("nexus-bases-view");

		// Get the active file
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.renderEmptyState("No active file. Open a note to see its bases view.");
			return;
		}

		// Create the base code block markdown
		const basesMarkdown = `
\`\`\`base
views:
  - type: table
    name: Children
    order:
      - file.name
    filters:
      and:
        - this.Child.contains(file)
        - _Archived != true
  - type: table
    name: Parent
    order:
      - file.name
    filters:
      and:
        - this.Parent.contains(file)
        - _Archived != true
  - type: table
    name: Related
    order:
      - file.name
    filters:
      and:
        - this.Related.contains(file)
        - _Archived != true
\`\`\`
`;

		// Create container for the rendered markdown
		const markdownContainer = this.contentEl.createDiv({
			cls: "nexus-bases-markdown-container",
		});

		// Render using Obsidian's MarkdownRenderer
		// This will process the base code block and render the tables
		await MarkdownRenderer.render(this.app, basesMarkdown, markdownContainer, activeFile.path, this.component);
	}

	private renderEmptyState(message: string): void {
		this.contentEl.createDiv({
			text: message,
			cls: "nexus-bases-empty-state",
		});
	}

	async updateActiveFile(): Promise<void> {
		await this.render();
	}

	destroy(): void {
		if (this.component) {
			this.component.unload();
		}
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
