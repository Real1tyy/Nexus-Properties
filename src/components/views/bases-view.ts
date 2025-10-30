import { type App, Component, MarkdownRenderer, type TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type NexusPropertiesPlugin from "../../main";
import type { NexusPropertiesSettings } from "../../types/settings";
import { IncludedPropertiesEvaluator } from "../../utils/included-properties";
import { RegisteredEventsComponent } from "./component";

export const VIEW_TYPE_BASES = "nexus-bases-view";

export type BaseViewType =
	| "children"
	| "parent"
	| "related"
	| "archived-children"
	| "archived-parent"
	| "archived-related";

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
	private selectedViewType: BaseViewType = "children";
	private viewSelectorEl: HTMLElement | null = null;
	private onViewTypeChange?: (viewType: BaseViewType) => void;

	constructor(
		app: App,
		containerEl: HTMLElement,
		plugin: NexusPropertiesPlugin,
		initialViewType?: BaseViewType,
		onViewTypeChange?: (viewType: BaseViewType) => void
	) {
		super();
		this.app = app;
		this.contentEl = containerEl;
		this.plugin = plugin;
		this.component = new Component();
		this.component.load();
		this.currentSettings = plugin.settingsStore.currentSettings;
		this.includedPropertiesEvaluator = new IncludedPropertiesEvaluator(plugin.settingsStore.settings$);
		this.onViewTypeChange = onViewTypeChange;

		if (initialViewType) {
			this.selectedViewType = initialViewType;
		}

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

		// Validate and reset view type if necessary
		this.validateSelectedViewType();

		// Create view selector buttons
		this.createViewSelector();

		// Create container for the rendered markdown
		const markdownContainer = this.contentEl.createDiv({
			cls: "nexus-bases-markdown-container",
		});

		// Render the selected view
		await this.renderSelectedView(activeFile, markdownContainer);
	}

	private validateSelectedViewType(): void {
		const isArchivedView = this.selectedViewType.startsWith("archived-");

		if (isArchivedView && !this.currentSettings.excludeArchived) {
			const baseType = this.selectedViewType.replace("archived-", "") as BaseViewType;
			this.selectedViewType = baseType;
		}
	}

	private createViewSelector(): void {
		this.viewSelectorEl = this.contentEl.createDiv({
			cls: "nexus-bases-view-selector",
		});

		const viewTypes: { type: BaseViewType; label: string }[] = this.currentSettings.excludeArchived
			? [
					{ type: "children", label: "Children" },
					{ type: "parent", label: "Parent" },
					{ type: "related", label: "Related" },
					{ type: "archived-children", label: "Archived Children" },
					{ type: "archived-parent", label: "Archived Parent" },
					{ type: "archived-related", label: "Archived Related" },
				]
			: [
					{ type: "children", label: "Children" },
					{ type: "parent", label: "Parent" },
					{ type: "related", label: "Related" },
				];

		for (const { type, label } of viewTypes) {
			const button = this.viewSelectorEl.createEl("button", {
				text: label,
				cls: "nexus-bases-view-button",
			});

			if (type === this.selectedViewType) {
				button.addClass("is-active");
			}

			button.addEventListener("mousedown", async (e) => {
				e.preventDefault();
				this.selectedViewType = type;
				if (this.onViewTypeChange) {
					this.onViewTypeChange(type);
				}
				await this.render();
			});
		}
	}

	private async renderSelectedView(activeFile: TFile, container: HTMLElement): Promise<void> {
		const includedProperties = this.includedPropertiesEvaluator.evaluateIncludedProperties(activeFile.path);
		const orderArray = includedProperties.map((prop) => `      - ${prop}`).join("\n");

		const viewConfig = this.getViewConfig(this.selectedViewType);
		const archivedFilter = this.getArchivedFilter(this.selectedViewType);

		const formulasSection = this.buildFormulasSection();
		const sortSection = this.buildSortSection();

		const basesMarkdown = `
\`\`\`base
${formulasSection}views:
  - type: table
    name: ${viewConfig.name}
    order:
${orderArray}
    filters:
      and:
        - this.${viewConfig.prop}.contains(file)${archivedFilter}${sortSection}
\`\`\`
`;
		await MarkdownRenderer.render(this.app, basesMarkdown, container, activeFile.path, this.component);
	}

	private buildFormulasSection(): string {
		// Don't use trim() - it removes leading spaces from first line, breaking indentation
		const formulas = this.currentSettings.basesCustomFormulas;
		if (!formulas || formulas.trim() === "") {
			return "";
		}
		return `formulas:\n${formulas}\n`;
	}

	private buildSortSection(): string {
		// Don't use trim() - it removes leading spaces from first line, breaking indentation
		const sort = this.currentSettings.basesCustomSort;
		if (!sort || sort.trim() === "") {
			return "";
		}
		return `\n    sort:\n${sort}`;
	}

	private getViewConfig(viewType: BaseViewType): { name: string; prop: string } {
		switch (viewType) {
			case "children":
				return { name: "Children", prop: this.currentSettings.childrenProp };
			case "parent":
				return { name: "Parent", prop: this.currentSettings.parentProp };
			case "related":
				return { name: "Related", prop: this.currentSettings.relatedProp };
			case "archived-children":
				return { name: "Archived Children", prop: this.currentSettings.childrenProp };
			case "archived-parent":
				return { name: "Archived Parent", prop: this.currentSettings.parentProp };
			case "archived-related":
				return { name: "Archived Related", prop: this.currentSettings.relatedProp };
		}
	}

	private getArchivedFilter(viewType: BaseViewType): string {
		if (!this.currentSettings.excludeArchived) {
			return "";
		}

		const archivedProp = this.currentSettings.archivedProp;
		const isArchivedView = viewType.startsWith("archived-");

		return `\n        - ${archivedProp} ${isArchivedView ? "==" : "!="} true`;
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

	getSelectedViewType(): BaseViewType {
		return this.selectedViewType;
	}

	destroy(): void {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}
		if (this.component) {
			this.component.unload();
		}
		this.viewSelectorEl = null;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
