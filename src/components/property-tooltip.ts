import type { App } from "obsidian";
import type { Subscription } from "rxjs";
import type { SettingsStore } from "../core/settings-store";
import type { NexusPropertiesSettings } from "../types/settings";
import { extractDisplayName, getFileContext } from "../utils/file";
import { formatValueForNode, isEmptyValue } from "../utils/frontmatter-value";

export interface PropertyTooltipOptions {
	settingsStore: SettingsStore;
	currentFilePath?: string;
	onFileOpen?: (filePath: string, event: MouseEvent) => void;
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

		// Subscribe to settings changes to re-render if tooltip is visible
		this.settingsSubscription = options.settingsStore.settings$.subscribe((settings) => {
			this.settings = settings;
			// If tooltip is visible, we could re-render it here if needed
		});
	}

	show(filePath: string, mouseEvent: MouseEvent): void {
		// Don't show tooltip if setting is disabled
		if (!this.settings.showGraphTooltips) {
			return;
		}

		if (this.settings.displayNodeProperties.length === 0) {
			return;
		}

		const { file, frontmatter } = getFileContext(this.app, filePath);
		if (!file || !frontmatter) {
			return;
		}

		const propertyData = this.settings.displayNodeProperties
			.map((propName) => {
				const value = frontmatter[propName];
				return value !== undefined && value !== null ? { key: propName, value } : null;
			})
			.filter((prop): prop is { key: string; value: unknown } => {
				if (prop === null) return false;

				// Hide empty properties if configured
				if (this.settings.hideEmptyProperties && isEmptyValue(prop.value)) {
					return false;
				}

				// Hide underscore properties if configured
				if (this.settings.hideUnderscoreProperties && prop.key.startsWith("_")) {
					return false;
				}

				return true;
			});

		// Create tooltip element
		this.hide();
		this.tooltipEl = document.createElement("div");
		this.tooltipEl.addClass("nexus-property-tooltip");

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
			cls: "nexus-property-tooltip-title",
		});

		const titleLink = titleEl.createEl("a", {
			text: displayName,
			cls: "nexus-property-tooltip-title-link",
		});

		titleLink.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (this.options.onFileOpen) {
				this.options.onFileOpen(filePath, e);
			}
		});

		// Add separator if there are properties
		if (propertyData.length > 0) {
			this.tooltipEl.createDiv("nexus-property-tooltip-separator");
		}

		for (const { key, value } of propertyData) {
			const propEl = this.tooltipEl.createDiv("nexus-property-tooltip-item");
			const keyEl = propEl.createSpan("nexus-property-tooltip-key");
			keyEl.setText(`${key}:`);
			const valueEl = propEl.createSpan("nexus-property-tooltip-value");

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
					container.createSpan({ text: ", ", cls: "nexus-property-separator" });
				}
				this.renderStringValue(container, stringValues[i]);
			}
			return;
		}

		// Handle strings
		if (typeof value === "string") {
			this.renderStringValue(container, value);
			return;
		}

		// Handle booleans
		if (typeof value === "boolean") {
			container.setText(value ? "Yes" : "No");
			return;
		}

		// Handle numbers
		if (typeof value === "number") {
			container.setText(value.toString());
			return;
		}

		// Handle objects
		if (typeof value === "object") {
			container.setText(formatValueForNode(value, 30));
			return;
		}

		container.setText(String(value));
	}

	private renderStringValue(container: HTMLElement, text: string): void {
		// Parse for wiki links
		const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
		let lastIndex = 0;
		const matches = text.matchAll(wikiLinkRegex);
		let hasMatches = false;

		for (const match of matches) {
			hasMatches = true;

			// Add text before the link
			if (match.index !== undefined && match.index > lastIndex) {
				container.createSpan({ text: text.substring(lastIndex, match.index) });
			}

			// Create clickable link
			const linkPath = match[1];
			const displayText = match[2] || linkPath;

			const linkEl = container.createEl("a", {
				text: displayText,
				cls: "nexus-property-link",
			});

			linkEl.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (this.options.onFileOpen) {
					this.options.onFileOpen(linkPath, e);
				}
			});

			lastIndex = (match.index ?? 0) + match[0].length;
		}

		// Add remaining text
		if (hasMatches && lastIndex < text.length) {
			container.createSpan({ text: text.substring(lastIndex) });
		}

		// If no wiki links found, just add the text
		if (!hasMatches) {
			container.setText(text);
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
