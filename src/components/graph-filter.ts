import { buildPropertyMapping, sanitizeExpression } from "../utils/expression-utils";
import { InputFilterManager } from "./input-filter-manager";

export class GraphFilter extends InputFilterManager {
	private compiledFunc: ((...args: any[]) => boolean) | null = null;
	private propertyMapping = new Map<string, string>();

	constructor(
		parentEl: HTMLElement,
		onFilterChange: () => void,
		private onClose: () => void,
		initiallyVisible: boolean = false
	) {
		super(
			parentEl,
			"Filter nodes (e.g., status === 'active')",
			"nexus-graph-filter-input",
			onFilterChange,
			initiallyVisible
		);
	}

	protected updateFilterValue(value: string): void {
		super.updateFilterValue(value);
		this.compiledFunc = null;
		this.propertyMapping.clear();
	}

	setFilterValue(value: string): void {
		if (this.inputEl) {
			this.inputEl.value = value;
		}
		this.updateFilterValue(value);
	}

	shouldInclude(frontmatter: Record<string, any>): boolean {
		if (!this.currentValue) return true;

		try {
			if (this.propertyMapping.size === 0) {
				this.propertyMapping = buildPropertyMapping(Object.keys(frontmatter));
			}

			if (!this.compiledFunc) {
				const sanitized = sanitizeExpression(this.currentValue, this.propertyMapping);
				const params = Array.from(this.propertyMapping.values());
				this.compiledFunc = new Function(...params, `"use strict"; return ${sanitized};`) as (
					...args: any[]
				) => boolean;
			}

			const values = Array.from(this.propertyMapping.keys()).map((key) => frontmatter[key]);
			return this.compiledFunc(...values);
		} catch (error) {
			console.warn("Invalid filter expression:", this.currentValue, error);
			return true;
		}
	}

	hide(): void {
		super.hide();
		this.onClose();
	}
}
