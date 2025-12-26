import {
	extractDisplayName,
	filterSpecificProperties,
	formatValue,
	getFileContext,
	parseInlineWikiLinks,
} from "@real1ty-obsidian-plugins/utils";
import type { App } from "obsidian";
import type { Subscription } from "rxjs";
import type { SettingsStore } from "../core/settings-store";
import type { NexusPropertiesSettings } from "../types/settings";
import { cls } from "../utils/css";

interface PropertyTooltipOptions {
	settingsStore: SettingsStore;
	currentFilePath?: string;
	onFileOpen?: (filePath: string, event: MouseEvent) => void;
	isZoomMode?: () => boolean;
}

export class PropertyTooltip {
	private tooltipEl: HTMLElement | null = null;
	private hideTimer: number | null = null;
	private settings: NexusPropertiesSettings;
	private settingsSubscription: Subscription | null = null;

	constructor(
		private app: App,
		private options: PropertyTooltipOptions
	) {
		this.settings = options.settingsStore.currentSettings;

		// Subscribe to settings changes to update tooltip width dynamically
		this.settingsSubscription = options.settingsStore.settings$.subscribe((settings) => {
			this.settings = settings;
			if (this.tooltipEl) {
				this.tooltipEl.style.maxWidth = `${settings.graphTooltipWidth}px`;
			}
		});
	}

	show(filePath: string, mouseEvent: MouseEvent): void {
		// Don't show tooltip if setting is disabled
		if (!this.settings.showGraphTooltips) {
			return;
		}

		if (this.options.isZoomMode?.()) {
			return;
		}

		if (this.settings.displayNodeProperties.length === 0) {
			return;
		}

		const { file, frontmatter } = getFileContext(this.app, filePath);
		if (!file || !frontmatter) {
			return;
		}

		const propertyData = filterSpecificProperties(frontmatter, this.settings.displayNodeProperties, this.settings);

		// Create tooltip element
		this.hide();
		this.tooltipEl = document.createElement("div");
		this.tooltipEl.addClass(cls("property-tooltip"));
		this.tooltipEl.style.maxWidth = `${this.settings.graphTooltipWidth}px`;

		// Keep tooltip open when hovering over it
		this.tooltipEl.addEventListener("mouseenter", () => {
			this.cancelHideTimer();
		});

		this.tooltipEl.addEventListener("mouseleave", () => {
			this.hide();
		});

		// Add clickable title at the top
		const displayName = extractDisplayName(filePath);
		const titleEl = this.tooltipEl.createEl("div", {
			cls: cls("property-tooltip-title"),
		});

		const titleLink = titleEl.createEl("a", {
			text: displayName,
			cls: cls("property-tooltip-title-link"),
		});

		titleLink.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (this.options.onFileOpen) {
				this.options.onFileOpen(filePath, e);
			}
		});

		if (propertyData.length > 0) {
			this.tooltipEl.createDiv(cls("property-tooltip-separator"));
		}

		for (const { key, value } of propertyData) {
			const propEl = this.tooltipEl.createDiv(cls("property-tooltip-item"));
			const keyEl = propEl.createSpan(cls("property-tooltip-key"));
			keyEl.setText(`${key}:`);
			const valueEl = propEl.createSpan(cls("property-tooltip-value"));

			// Render value with clickable links
			this.renderPropertyValue(valueEl, value);
		}

		// Position tooltip to the left of cursor to avoid context menu overlap
		// NOTE: Inline styles are acceptable here - runtime-calculated position during hover interaction
		document.body.appendChild(this.tooltipEl);

		// Position to the left to avoid context menu (which appears on right-click)
		const offsetX = 35;
		const offsetY = 10;

		// Check if tooltip would go off-screen and adjust if needed
		const tooltipRect = this.tooltipEl.getBoundingClientRect();
		let left = mouseEvent.clientX - tooltipRect.width - offsetX;
		const top = mouseEvent.clientY + offsetY;

		// If tooltip goes off the left edge, position to the right of cursor instead
		if (left < 0) {
			left = mouseEvent.clientX + 15;
		}

		// Ensure tooltip doesn't go off the bottom
		let adjustedTop = top;
		if (top + tooltipRect.height > window.innerHeight) {
			adjustedTop = window.innerHeight - tooltipRect.height - 10;
		}

		this.tooltipEl.style.left = `${left}px`;
		this.tooltipEl.style.top = `${adjustedTop}px`;
	}

	hide(): void {
		this.cancelHideTimer();

		if (this.tooltipEl) {
			this.tooltipEl.remove();
			this.tooltipEl = null;
		}
	}

	scheduleHide(delayMs = 300): void {
		this.cancelHideTimer();

		this.hideTimer = window.setTimeout(() => {
			this.hide();
			this.hideTimer = null;
		}, delayMs);
	}

	cancelHideTimer(): void {
		if (this.hideTimer !== null) {
			window.clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}
	}

	private renderPropertyValue(container: HTMLElement, value: unknown): void {
		if (value === null || value === undefined) {
			container.setText("");
			return;
		}

		// Handle arrays
		if (Array.isArray(value)) {
			const stringValues = value.filter((item) => typeof item === "string");

			if (stringValues.length === 0) {
				container.setText("");
				return;
			}

			// Render each item
			for (let i = 0; i < stringValues.length; i++) {
				if (i > 0) {
					container.createSpan({ text: ", ", cls: cls("property-separator") });
				}
				this.renderStringValue(container, stringValues[i]);
			}
			return;
		}

		// Handle strings with potential wiki links
		if (typeof value === "string") {
			this.renderStringValue(container, value);
			return;
		}

		container.setText(formatValue(value));
	}

	private renderStringValue(container: HTMLElement, text: string): void {
		const segments = parseInlineWikiLinks(text);

		for (const segment of segments) {
			if (segment.type === "text") {
				container.createSpan({ text: segment.content });
			} else if (segment.type === "link" && segment.linkPath && segment.displayText) {
				const linkEl = container.createEl("a", {
					text: segment.displayText,
					cls: cls("property-link"),
				});

				linkEl.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (this.options.onFileOpen && segment.linkPath) {
						this.options.onFileOpen(segment.linkPath, e);
					}
				});
			}
		}
	}

	destroy(): void {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		this.hide();
	}
}
