import { type App, Component, MarkdownRenderer } from "obsidian";
import type { Subscription } from "rxjs";
import type NexusPropertiesPlugin from "../../main";
import type { NexusPropertiesSettings } from "../../types/settings";
import { IncludedPropertiesEvaluator } from "../../utils/included-properties";
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
	private plugin: NexusPropertiesPlugin;
	private includedPropertiesEvaluator: IncludedPropertiesEvaluator;
	private settingsSubscription: Subscription | null = null;
	private currentSettings: NexusPropertiesSettings;

	constructor(app: App, containerEl: HTMLElement, plugin: NexusPropertiesPlugin) {
		super();
		this.app = app;
		this.contentEl = containerEl;
		this.plugin = plugin;
		this.component = new Component();
		this.component.load();
		this.currentSettings = plugin.settingsStore.currentSettings;
		this.includedPropertiesEvaluator = new IncludedPropertiesEvaluator(plugin.settingsStore.settings$);

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe((settings) => {
			this.currentSettings = settings;
			this.render();
		});
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

		const includedProperties = this.includedPropertiesEvaluator.evaluateIncludedProperties(activeFile.path);

		const orderArray = includedProperties.map((prop) => `      - ${prop}`).join("\n");

		const childrenProp = this.currentSettings.childrenProp;
		const parentProp = this.currentSettings.parentProp;
		const relatedProp = this.currentSettings.relatedProp;

		const basesMarkdown = `
\`\`\`base
views:
  - type: table
    name: Children
    order:
${orderArray}
    filters:
      and:
        - this.${childrenProp}.contains(file)
        - _Archived != true
  - type: table
    name: Parent
    order:
${orderArray}
    filters:
      and:
        - this.${parentProp}.contains(file)
        - _Archived != true
  - type: table
    name: Related
    order:
${orderArray}
    filters:
      and:
        - this.${relatedProp}.contains(file)
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
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}
		if (this.component) {
			this.component.unload();
		}
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
