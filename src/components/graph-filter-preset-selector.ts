import type { FilterPreset } from "../types/settings";
import { cls } from "../utils/css";

export class GraphFilterPresetSelector {
	private containerEl: HTMLElement;
	private selectEl: HTMLSelectElement | null = null;

	constructor(
		private parentEl: HTMLElement,
		private presets: FilterPreset[],
		private onPresetSelected: (expression: string) => void,
		initiallyVisible: boolean
	) {
		const classes = initiallyVisible
			? cls("graph-filter-preset-container")
			: cls("graph-filter-preset-container", "hidden");
		this.containerEl = this.parentEl.createEl("div", {
			cls: classes,
		});

		this.render();
	}

	private render(): void {
		this.selectEl = this.containerEl.createEl("select", {
			cls: cls("graph-filter-preset-select"),
		});

		this.rebuildSelectOptions();

		this.selectEl.addEventListener("change", () => {
			const value = this.selectEl?.value || "";
			if (value === "clear") {
				this.onPresetSelected("");
			} else if (value) {
				this.onPresetSelected(value);
			}
			// Reset to placeholder after selection
			if (this.selectEl) {
				this.selectEl.selectedIndex = 0;
			}
		});
	}

	private rebuildSelectOptions(): void {
		if (!this.selectEl) return;

		// Clear all options
		this.selectEl.innerHTML = "";

		// Hidden placeholder option
		const placeholderOption = document.createElement("option");
		placeholderOption.value = "";
		placeholderOption.textContent = "Filter";
		placeholderOption.disabled = true;
		placeholderOption.selected = true;
		placeholderOption.hidden = true;
		this.selectEl.appendChild(placeholderOption);

		// Clear option
		const clearOption = document.createElement("option");
		clearOption.value = "clear";
		clearOption.textContent = "Clear Filter";
		this.selectEl.appendChild(clearOption);

		// User presets
		for (const preset of this.presets) {
			const option = document.createElement("option");
			option.value = preset.expression;
			option.textContent = preset.name;
			this.selectEl.appendChild(option);
		}

		// Reset to placeholder
		this.selectEl.selectedIndex = 0;
	}

	updatePresets(presets: FilterPreset[]): void {
		this.presets = presets;
		this.rebuildSelectOptions();
	}

	show(): void {
		this.containerEl.removeClass(cls("hidden"));
	}

	hide(): void {
		this.containerEl.addClass(cls("hidden"));
	}

	focus(): void {
		this.selectEl?.focus();
		// Try to open the dropdown
		if (this.selectEl && "showPicker" in this.selectEl) {
			try {
				(this.selectEl as any).showPicker();
			} catch {
				// Fallback silently if showPicker fails
			}
		}
	}

	isVisible(): boolean {
		return !this.containerEl.hasClass(cls("hidden"));
	}

	destroy(): void {
		this.containerEl.remove();
		this.selectEl = null;
	}
}
