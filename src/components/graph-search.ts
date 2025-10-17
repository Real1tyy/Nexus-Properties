export interface GraphSearchProps {
	onSearchChange: (query: string) => void;
	onClose: () => void;
}

export class GraphSearch {
	private containerEl: HTMLElement;
	private searchInputEl: HTMLInputElement | null = null;
	private searchDebounceTimer: number | null = null;
	private readonly debounceMs = 500;

	constructor(
		private parentEl: HTMLElement,
		private props: GraphSearchProps
	) {
		this.containerEl = this.parentEl.createEl("div", {
			cls: "nexus-graph-search-container nexus-hidden",
		});

		this.render();
	}

	private render(): void {
		this.searchInputEl = this.containerEl.createEl("input", {
			type: "text",
			cls: "nexus-graph-search-input",
			placeholder: "Search nodes by name...",
		});

		this.searchInputEl.addEventListener("input", () => {
			this.handleSearchInput();
		});

		this.searchInputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Escape") {
				this.hide();
			} else if (evt.key === "Enter") {
				this.applySearchImmediately();
			}
		});
	}

	private handleSearchInput(): void {
		// Clear existing timer
		if (this.searchDebounceTimer !== null) {
			window.clearTimeout(this.searchDebounceTimer);
		}

		// Set new timer to apply filter after 500ms of no typing
		this.searchDebounceTimer = window.setTimeout(() => {
			this.applySearchImmediately();
		}, this.debounceMs);
	}

	private applySearchImmediately(): void {
		const query = this.searchInputEl?.value.trim().toLowerCase() ?? "";
		this.props.onSearchChange(query);
	}

	show(): void {
		this.containerEl.removeClass("nexus-hidden");
		this.searchInputEl?.focus();
	}

	hide(): void {
		this.containerEl.addClass("nexus-hidden");
		if (this.searchInputEl) {
			this.searchInputEl.value = "";
		}
		// Clear search filter when hiding
		this.props.onSearchChange("");
		this.props.onClose();
	}

	isVisible(): boolean {
		return !this.containerEl.hasClass("nexus-hidden");
	}

	destroy(): void {
		// Clean up debounce timer
		if (this.searchDebounceTimer !== null) {
			window.clearTimeout(this.searchDebounceTimer);
			this.searchDebounceTimer = null;
		}

		this.containerEl.remove();
		this.searchInputEl = null;
	}
}
