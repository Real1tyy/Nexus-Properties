export interface GraphHeaderProps {
	currentFileName: string;
	renderRelated: boolean;
	includeAllRelated: boolean;
	startFromCurrent: boolean;
	isFolderNote?: boolean;
	onRenderRelatedChange: (value: boolean) => void;
	onIncludeAllRelatedChange: (value: boolean) => void;
	onStartFromCurrentChange: (value: boolean) => void;
}

export class GraphHeader {
	private headerEl: HTMLElement;
	private relatedCheckbox: HTMLInputElement | null = null;
	private includeAllCheckbox: HTMLInputElement | null = null;
	private toggleCheckbox: HTMLInputElement | null = null;
	private titleEl: HTMLElement | null = null;
	private relatedToggleContainer: HTMLElement | null = null;
	private startFromCurrentContainer: HTMLElement | null = null;
	private includeAllContainer: HTMLElement | null = null;

	constructor(
		private containerEl: HTMLElement,
		private props: GraphHeaderProps
	) {
		this.headerEl = this.containerEl.createEl("div", { cls: "nexus-graph-view-header" });
		this.render();
	}

	private makeContainerClickable(container: HTMLElement, checkbox: HTMLInputElement): void {
		container.style.cursor = "pointer";
		container.addEventListener("click", (e) => {
			// Don't double-trigger if clicking the checkbox itself
			if (e.target === checkbox) return;
			checkbox.click();
		});
	}

	private render(): void {
		this.headerEl.empty();

		// Title
		this.titleEl = this.headerEl.createEl("h4", {
			text: this.props.currentFileName || "No file selected",
			cls: "nexus-graph-view-title",
		});

		// Controls container
		const controlsContainer = this.headerEl.createEl("div", { cls: "nexus-graph-controls-container" });

		// Render Related checkbox
		this.relatedToggleContainer = controlsContainer.createEl("div", { cls: "nexus-graph-toggle-container" });
		this.relatedCheckbox = this.relatedToggleContainer.createEl("input", { type: "checkbox" });
		this.relatedCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.relatedCheckbox.checked = this.props.renderRelated;

		this.relatedToggleContainer.createEl("label", {
			text: "Render Related",
			cls: "nexus-graph-toggle-label",
		});

		this.relatedCheckbox.addEventListener("change", () => {
			const isChecked = this.relatedCheckbox?.checked ?? false;
			this.props.renderRelated = isChecked;
			this.props.onRenderRelatedChange(isChecked);
			this.updateVisibility();
		});

		this.makeContainerClickable(this.relatedToggleContainer, this.relatedCheckbox);

		// Include all related checkbox
		this.includeAllContainer = controlsContainer.createEl("div", { cls: "nexus-graph-toggle-container" });
		this.includeAllCheckbox = this.includeAllContainer.createEl("input", { type: "checkbox" });
		this.includeAllCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.includeAllCheckbox.checked = this.props.includeAllRelated;

		this.includeAllContainer.createEl("label", {
			text: "All Related",
			cls: "nexus-graph-toggle-label",
		});

		this.includeAllCheckbox.addEventListener("change", () => {
			this.props.onIncludeAllRelatedChange(this.includeAllCheckbox?.checked ?? false);
		});

		this.makeContainerClickable(this.includeAllContainer, this.includeAllCheckbox);

		// Start from current file checkbox
		this.startFromCurrentContainer = controlsContainer.createEl("div", { cls: "nexus-graph-toggle-container" });
		this.toggleCheckbox = this.startFromCurrentContainer.createEl("input", { type: "checkbox" });
		this.toggleCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.toggleCheckbox.checked = this.props.startFromCurrent;

		this.startFromCurrentContainer.createEl("label", {
			text: "Current file only",
			cls: "nexus-graph-toggle-label",
		});

		this.toggleCheckbox.addEventListener("change", () => {
			this.props.onStartFromCurrentChange(this.toggleCheckbox?.checked ?? false);
		});

		this.makeContainerClickable(this.startFromCurrentContainer, this.toggleCheckbox);

		this.updateVisibility();
	}

	updateTitle(fileName: string): void {
		if (this.titleEl) {
			this.titleEl.textContent = `Relationship Graph: ${fileName}`;
		}
	}

	private updateVisibility(): void {
		if (this.props.isFolderNote) {
			if (this.relatedToggleContainer) {
				this.relatedToggleContainer.toggleClass("nexus-hidden", false);
			}
			if (this.startFromCurrentContainer) {
				this.startFromCurrentContainer.toggleClass("nexus-hidden", true);
			}
			if (this.includeAllContainer) {
				this.includeAllContainer.toggleClass("nexus-hidden", true);
			}
			return;
		}

		// Normal visibility logic for non-folder notes
		if (this.relatedToggleContainer) {
			this.relatedToggleContainer.toggleClass("nexus-hidden", false);
		}
		if (this.startFromCurrentContainer) {
			this.startFromCurrentContainer.toggleClass("nexus-hidden", this.props.renderRelated);
		}
		if (this.includeAllContainer) {
			this.includeAllContainer.toggleClass("nexus-hidden", !this.props.renderRelated);
		}
	}

	update(props: Partial<GraphHeaderProps>): void {
		this.props = { ...this.props, ...props };
		if (props.currentFileName !== undefined) {
			this.updateTitle(props.currentFileName);
		}
		if (this.relatedCheckbox && props.renderRelated !== undefined) {
			this.relatedCheckbox.checked = props.renderRelated;
		}
		if (this.includeAllCheckbox && props.includeAllRelated !== undefined) {
			this.includeAllCheckbox.checked = props.includeAllRelated;
		}
		if (this.toggleCheckbox && props.startFromCurrent !== undefined) {
			this.toggleCheckbox.checked = props.startFromCurrent;
		}
		this.updateVisibility();
	}

	destroy(): void {
		this.headerEl.remove();
		this.relatedCheckbox = null;
		this.includeAllCheckbox = null;
		this.toggleCheckbox = null;
		this.titleEl = null;
		this.relatedToggleContainer = null;
		this.startFromCurrentContainer = null;
		this.includeAllContainer = null;
	}
}
