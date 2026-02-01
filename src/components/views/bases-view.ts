import { IncludedPropertiesEvaluator, RegisteredEventsComponent } from "@real1ty-obsidian-plugins";
import { type App, Component, MarkdownRenderer, type TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type NexusPropertiesPlugin from "../../main";
import type { NexusPropertiesSettings } from "../../types/settings";
import { buildBasesFilePathFilters } from "../../utils/bases-utils";
import { cls } from "../../utils/css";
import { collectRelatedNodesRecursively } from "../../utils/hierarchy";

const _VIEW_TYPE_BASES = "nexus-bases-view";

export type BaseViewType = "children" | "parent" | "related" | "all-children" | "all-parent" | "all-related";

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

		// Reset to "children" if an "all-*" view is selected but the setting is disabled
		if (this.selectedViewType.startsWith("all-") && !this.currentSettings.showAllRelationshipViews) {
			this.selectedViewType = "children";
		}
	}

	private getViewOptions(): { type: BaseViewType; label: string }[] {
		const viewTypes: { type: BaseViewType; label: string }[] = [
			{ type: "children", label: "Children" },
			{ type: "parent", label: "Parent" },
			{ type: "related", label: "Related" },
		];

		// Add "All" view types if enabled in settings
		if (this.currentSettings.showAllRelationshipViews) {
			viewTypes.push(
				{ type: "all-children", label: "All Children" },
				{ type: "all-parent", label: "All Parents" },
				{ type: "all-related", label: "All Related" }
			);
		}

		return viewTypes;
	}

	private createViewSelector(): void {
		this.viewSelectorEl = this.contentEl.createDiv({
			cls: cls("bases-view-selector"),
		});

		const selectEl = this.viewSelectorEl.createEl("select", {
			cls: cls("bases-select"),
		});

		const viewOptions = this.getViewOptions();

		for (const { type, label } of viewOptions) {
			selectEl.createEl("option", {
				value: type,
				text: label,
			});
		}

		selectEl.value = this.selectedViewType;

		selectEl.addEventListener("change", async () => {
			this.selectedViewType = selectEl.value as BaseViewType;
			if (this.onViewTypeChange) {
				this.onViewTypeChange(this.selectedViewType);
			}
			// Force re-render by clearing last path since view changed
			this.lastFilePath = null;
			await this.render();
		});

		// Right-click to toggle forward through views
		selectEl.addEventListener("contextmenu", async (e) => {
			e.preventDefault();
			await this.toggleViewForward();
		});
	}

	private async renderSelectedView(activeFile: TFile, container: HTMLElement): Promise<void> {
		const basesMarkdown = this.selectedViewType.startsWith("all-")
			? this.buildRecursiveBasesMarkdown(activeFile)
			: this.buildNormalBasesMarkdown(activeFile);

		await MarkdownRenderer.render(this.app, basesMarkdown, container, activeFile.path, this.component);
	}

	private buildNormalBasesMarkdown(activeFile: TFile): string {
		const orderArray = this.buildOrderArray(activeFile);
		const viewConfig = this.getViewConfig(this.selectedViewType);
		const archivedFilter = this.getArchivedFilter();
		const formulasSection = this.buildFormulasSection();
		const sortSection = this.buildSortSection();

		return `
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
	}

	private buildRecursiveBasesMarkdown(activeFile: TFile): string {
		const relationshipType = this.selectedViewType.replace("all-", "") as "children" | "parent" | "related";
		const allNodes = collectRelatedNodesRecursively(this.app, this.plugin.indexer, activeFile, relationshipType);

		const orderArray = this.buildOrderArray(activeFile);
		const viewName = this.getAllViewName(relationshipType, allNodes.size);
		const filePathFilters = buildBasesFilePathFilters(Array.from(allNodes));
		const archivedFilter = this.getArchivedFilter();
		const formulasSection = this.buildFormulasSection();
		const sortSection = this.buildSortSection();

		return `
\`\`\`base
${formulasSection}filters:
  or:
${filePathFilters}
views:
  - type: table
    name: ${viewName}
    order:
${orderArray}${
			archivedFilter
				? `
    filters:
      and:${archivedFilter}`
				: ""
		}${sortSection}
\`\`\`
`;
	}

	private buildOrderArray(activeFile: TFile): string {
		const includedProperties = this.includedPropertiesEvaluator.evaluateIncludedProperties(activeFile.path);
		if (includedProperties[0] === "file.name" && this.currentSettings.titlePropertyMode === "enabled") {
			includedProperties[0] = this.currentSettings.titleProp;
		}
		return includedProperties.map((prop) => `      - ${prop}`).join("\n");
	}

	private getAllViewName(relationshipType: "children" | "parent" | "related", count: number): string {
		const prefix = this.showArchived ? "Archived " : "";
		switch (relationshipType) {
			case "children":
				return `${prefix}All Children (${count})`;
			case "parent":
				return `${prefix}All Parents (${count})`;
			case "related":
				return `${prefix}All Related (${count})`;
			default:
				return `${prefix}All Nodes (${count})`;
		}
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

	private getViewConfig(viewType: BaseViewType): {
		name: string;
		prop: string;
	} {
		const prefix = this.showArchived ? "Archived " : "";
		switch (viewType) {
			case "children":
				return {
					name: `${prefix}Children`,
					prop: this.currentSettings.childrenProp,
				};
			case "parent":
				return {
					name: `${prefix}Parent`,
					prop: this.currentSettings.parentProp,
				};
			case "related":
				return {
					name: `${prefix}Related`,
					prop: this.currentSettings.relatedProp,
				};
			default:
				// For all-* types, this shouldn't be called
				return {
					name: `${prefix}All`,
					prop: this.currentSettings.childrenProp,
				};
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

	async toggleViewForward(): Promise<void> {
		await this.navigateView(1);
	}

	async toggleViewBackward(): Promise<void> {
		await this.navigateView(-1);
	}

	async goToViewByIndex(index: number): Promise<void> {
		const viewOptions = this.getViewOptions();
		if (index < 0 || index >= viewOptions.length) return;
		await this.setView(viewOptions[index].type);
	}

	private async navigateView(direction: 1 | -1): Promise<void> {
		const viewOptions = this.getViewOptions();
		if (viewOptions.length === 0) return;

		const currentIndex = viewOptions.findIndex((opt) => opt.type === this.selectedViewType);
		const nextIndex = (currentIndex + direction + viewOptions.length) % viewOptions.length;
		await this.setView(viewOptions[nextIndex].type);
	}

	private async setView(viewType: BaseViewType): Promise<void> {
		this.selectedViewType = viewType;
		if (this.onViewTypeChange) {
			this.onViewTypeChange(this.selectedViewType);
		}
		this.lastFilePath = null;
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
		this.viewSelectorEl = null;
		this.lastFilePath = null;
		this.isUpdating = false;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
