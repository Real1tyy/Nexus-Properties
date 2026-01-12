import { IncludedPropertiesEvaluator, RegisteredEventsComponent } from "@real1ty-obsidian-plugins/utils";
import { type App, Component, MarkdownRenderer, type TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type NexusPropertiesPlugin from "../../main";
import type { NexusPropertiesSettings } from "../../types/settings";
import { cls } from "../../utils/css";

const _VIEW_TYPE_BASES = "nexus-bases-view";

export type BaseViewType = "children" | "parent" | "related";

/**
 * Bases view component that uses Obsidian's Bases API to render
 * Children, Parent, and Related files using native base code blocks
 */
export class BasesView extends RegisteredEventsComponent {
	private app: App;
	private contentEl: HTMLElement;
	private component: Component;
	private plugin: NexusPropertiesPlugin;
	private includedPropertiesEvaluator: IncludedPropertiesEvaluator<NexusPropertiesSettings>;
	private settingsSubscription: Subscription | null = null;
	private currentSettings: NexusPropertiesSettings;
	private selectedViewType: BaseViewType = "children";
	private showArchived = false;
	private viewSelectorEl: HTMLElement | null = null;
	private onViewTypeChange?: (viewType: BaseViewType) => void;
	private lastFilePath: string | null = null;
	private isUpdating = false;

	constructor(
		app: App,
		containerEl: HTMLElement,
		plugin: NexusPropertiesPlugin,
		initialViewType?: BaseViewType,
		initialShowArchived?: boolean,
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

		if (initialShowArchived !== undefined) {
			this.showArchived = initialShowArchived;
		}

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe((settings) => {
			this.currentSettings = settings;
			// Force re-render when settings change
			this.lastFilePath = null;
			this.render();
		});
	}

	async render(): Promise<void> {
		// Prevent concurrent updates
		if (this.isUpdating) {
			return;
		}

		this.isUpdating = true;

		try {
			// Get the active file
			const activeFile = this.app.workspace.getActiveFile();
			const currentFilePath = activeFile?.path || "";

			// Early return: Has the file actually changed?
			// This prevents unnecessary re-renders that break focus
			if (currentFilePath === this.lastFilePath && currentFilePath !== "") {
				return;
			}

			// Update tracking
			this.lastFilePath = currentFilePath;

			// Clear and render
			this.contentEl.empty();
			this.contentEl.addClass(cls("bases-view"));

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
				cls: cls("bases-markdown-container"),
			});

			// Render the selected view
			await this.renderSelectedView(activeFile, markdownContainer);
		} finally {
			this.isUpdating = false;
		}
	}

	private validateSelectedViewType(): void {
		if (this.showArchived && !this.currentSettings.excludeArchived) {
			this.showArchived = false;
		}
	}

	private createViewSelector(): void {
		this.viewSelectorEl = this.contentEl.createDiv({
			cls: cls("bases-view-selector"),
		});

		const viewTypes: { type: BaseViewType; label: string }[] = [
			{ type: "children", label: "Children" },
			{ type: "parent", label: "Parent" },
			{ type: "related", label: "Related" },
		];

		for (const { type, label } of viewTypes) {
			const button = this.viewSelectorEl.createEl("button", {
				text: label,
				cls: cls("bases-view-button"),
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
				// Force re-render by clearing last path since view changed
				this.lastFilePath = null;
				await this.render();
			});
		}
	}

	private async renderSelectedView(activeFile: TFile, container: HTMLElement): Promise<void> {
		const includedProperties = this.includedPropertiesEvaluator.evaluateIncludedProperties(activeFile.path);
		const orderArray = includedProperties.map((prop) => `      - ${prop}`).join("\n");

		const viewConfig = this.getViewConfig(this.selectedViewType);
		const archivedFilter = this.getArchivedFilter();

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
		const prefix = this.showArchived ? "Archived " : "";
		switch (viewType) {
			case "children":
				return { name: `${prefix}Children`, prop: this.currentSettings.childrenProp };
			case "parent":
				return { name: `${prefix}Parent`, prop: this.currentSettings.parentProp };
			case "related":
				return { name: `${prefix}Related`, prop: this.currentSettings.relatedProp };
		}
	}

	private getArchivedFilter(): string {
		if (!this.currentSettings.excludeArchived) {
			return "";
		}

		const archivedProp = this.currentSettings.archivedProp;

		return `\n        - ${archivedProp} ${this.showArchived ? "==" : "!="} true`;
	}

	private renderEmptyState(message: string): void {
		this.contentEl.createDiv({
			text: message,
			cls: cls("bases-empty-state"),
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
		this.lastFilePath = null;
		this.isUpdating = false;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
