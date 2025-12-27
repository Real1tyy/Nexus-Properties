import type { Core } from "cytoscape";
import { cls } from "../../utils/css";

export class ZoomIndicator {
	private containerEl: HTMLElement;
	private inputEl: HTMLInputElement;
	private cy: Core;
	private updateScheduled = false;

	constructor(containerEl: HTMLElement, cy: Core) {
		this.cy = cy;

		this.containerEl = containerEl.createEl("div", {
			cls: cls("zoom-indicator"),
		});

		this.inputEl = this.containerEl.createEl("input", {
			type: "text",
			cls: cls("zoom-indicator-input"),
		});

		this.inputEl.value = this.formatZoom(this.cy.zoom());

		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		// Update indicator when zoom changes
		this.cy.on("zoom", () => {
			this.scheduleUpdate();
		});

		// Handle input changes
		this.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				this.applyZoomFromInput();
				this.inputEl.blur();
			} else if (evt.key === "Escape") {
				this.inputEl.value = this.formatZoom(this.cy.zoom());
				this.inputEl.blur();
			}
		});

		this.inputEl.addEventListener("blur", () => {
			this.applyZoomFromInput();
		});

		// Select all on focus
		this.inputEl.addEventListener("focus", () => {
			this.inputEl.select();
		});
	}

	private scheduleUpdate(): void {
		if (this.updateScheduled) return;

		this.updateScheduled = true;
		requestAnimationFrame(() => {
			this.inputEl.value = this.formatZoom(this.cy.zoom());
			this.updateScheduled = false;
		});
	}

	private formatZoom(zoom: number): string {
		return `${Math.round(zoom * 100)}%`;
	}

	private applyZoomFromInput(): void {
		const value = this.inputEl.value.trim();
		const numericValue = Number.parseFloat(value.replace("%", ""));

		if (Number.isNaN(numericValue) || numericValue <= 0) {
			// Invalid input, reset to current zoom
			this.inputEl.value = this.formatZoom(this.cy.zoom());
			return;
		}

		// Convert percentage to zoom level (100% = 1.0)
		const targetZoom = numericValue / 100;

		// Clamp to min/max zoom
		const clampedZoom = Math.max(this.cy.minZoom(), Math.min(targetZoom, this.cy.maxZoom()));

		// Apply zoom
		this.cy.animate(
			{
				zoom: clampedZoom,
			},
			{
				duration: 200,
				easing: "ease-out",
			}
		);

		// Update input with actual applied value
		this.inputEl.value = this.formatZoom(clampedZoom);
	}

	destroy(): void {
		this.cy.removeListener("zoom");
		this.containerEl.remove();
	}
}
