import { cls } from "../../utils/css";

type FilterChangeCallback = () => void;

const DEFAULT_DEBOUNCE_MS = 150;

export abstract class InputFilterManager {
	protected containerEl: HTMLElement;
	protected inputEl: HTMLInputElement | null = null;
	protected debounceTimer: number | null = null;
	protected currentValue = "";
	protected persistentlyVisible = false;
	protected onHide?: () => void;

	constructor(
		protected parentEl: HTMLElement,
		protected placeholder: string,
		protected cssClass: string,
		protected onFilterChange: FilterChangeCallback,
		initiallyVisible: boolean,
		onHide?: () => void
	) {
		const classes = initiallyVisible ? `${cssClass}-container` : `${cssClass}-container ${cls("hidden")}`;
		this.containerEl = this.parentEl.createEl("div", {
			cls: classes,
		});
		this.onHide = onHide;

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
				// Only allow hiding if not persistently visible
				if (!this.persistentlyVisible) {
					this.hide();
				} else {
					// Just blur the input if persistently visible
					this.inputEl?.blur();
				}
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
		this.containerEl.removeClass(cls("hidden"));
		this.inputEl?.focus();
	}

	hide(): void {
		// Don't allow hiding if persistently visible
		if (this.persistentlyVisible) {
			return;
		}
		this.containerEl.addClass(cls("hidden"));
		if (this.inputEl) {
			this.inputEl.value = "";
		}
		this.updateFilterValue("");
		this.onHide?.();
	}

	focus(): void {
		this.inputEl?.focus();
	}

	isVisible(): boolean {
		return !this.containerEl.hasClass(cls("hidden"));
	}

	setPersistentlyVisible(value: boolean): void {
		this.persistentlyVisible = value;
		if (value) {
			this.show();
		} else {
			this.hide();
		}
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
