export type FilterChangeCallback = () => void;

const DEFAULT_DEBOUNCE_MS = 150;

export abstract class InputFilterManager {
	protected containerEl: HTMLElement;
	protected inputEl: HTMLInputElement | null = null;
	protected debounceTimer: number | null = null;
	protected currentValue = "";

	constructor(
		protected parentEl: HTMLElement,
		protected placeholder: string,
		protected cssClass: string,
		protected onFilterChange: FilterChangeCallback,
		initiallyVisible: boolean
	) {
		const classes = `${cssClass}-container${initiallyVisible ? "" : " nexus-hidden"}`;
		this.containerEl = this.parentEl.createEl("div", {
			cls: classes,
		});

		this.render();
	}

	private render(): void {
		this.inputEl = this.containerEl.createEl("input", {
			type: "text",
			cls: this.cssClass,
			placeholder: this.placeholder,
		});

		this.inputEl.addEventListener("input", () => {
			this.handleInputChange();
		});

		this.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Escape") {
				this.hide();
			} else if (evt.key === "Enter") {
				this.applyFilterImmediately();
			}
		});
	}

	private handleInputChange(): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			this.applyFilterImmediately();
		}, DEFAULT_DEBOUNCE_MS);
	}

	private applyFilterImmediately(): void {
		const newValue = this.inputEl?.value.trim() ?? "";
		if (newValue !== this.currentValue) {
			this.updateFilterValue(newValue);
		}
	}

	protected updateFilterValue(value: string): void {
		this.currentValue = value;
		this.onFilterChange();
	}

	getCurrentValue(): string {
		return this.currentValue;
	}

	show(): void {
		this.containerEl.removeClass("nexus-hidden");
		this.inputEl?.focus();
	}

	hide(): void {
		this.containerEl.addClass("nexus-hidden");
		if (this.inputEl) {
			this.inputEl.value = "";
		}
		this.updateFilterValue("");
	}

	focus(): void {
		this.inputEl?.focus();
	}

	isVisible(): boolean {
		return !this.containerEl.hasClass("nexus-hidden");
	}

	destroy(): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		this.containerEl.remove();
		this.inputEl = null;
	}

	abstract shouldInclude(data: any): boolean;
}
