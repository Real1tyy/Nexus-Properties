import { buildPropertyMapping, sanitizeExpression } from "@real1ty-obsidian-plugins/utils";
import { cls } from "../../utils/css";
import { InputFilterManager } from "./base";

export class GraphFilter extends InputFilterManager {
	private compiledFunc: ((...args: unknown[]) => boolean) | null = null;
	private propertyMapping = new Map<string, string>();
	private lastWarnedExpression: string | null = null;

	constructor(
		parentEl: HTMLElement,
		onFilterChange: () => void,
		initiallyVisible: boolean = false,
		onHide?: () => void
	) {
		super(
			parentEl,
			"Filter nodes (e.g., status === 'active')",
			cls("graph-filter-input"),
			onFilterChange,
			initiallyVisible,
			onHide
		);
	}

	protected updateFilterValue(value: string): void {
		super.updateFilterValue(value);
		this.compiledFunc = null;
		this.propertyMapping.clear();
		this.lastWarnedExpression = null;
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
			const currentKeys = new Set(Object.keys(frontmatter));
			const existingKeys = new Set(this.propertyMapping.keys());
			const newKeys = [...currentKeys].filter((key) => !existingKeys.has(key));

			if (newKeys.length > 0) {
				const allKeys = new Set([...existingKeys, ...currentKeys]);
				this.propertyMapping = buildPropertyMapping(Array.from(allKeys));
				this.compiledFunc = null;
			}

			if (!this.compiledFunc) {
				const sanitized = sanitizeExpression(this.currentValue, this.propertyMapping);
				const params = Array.from(this.propertyMapping.values());
				// eslint-disable-next-line @typescript-eslint/no-implied-eval -- Dynamic function creation for expression evaluation with sanitized input
				this.compiledFunc = new Function(...params, `"use strict"; return ${sanitized};`) as (
					...args: unknown[]
				) => boolean;
			}

			const values = Array.from(this.propertyMapping.keys()).map((key) => frontmatter[key] ?? undefined);
			const result = this.compiledFunc(...values);
			return result;
		} catch (error) {
			if (error instanceof ReferenceError) {
				const hasInequality = this.currentValue.includes("!==") || this.currentValue.includes("!=");
				return hasInequality;
			}

			if (this.lastWarnedExpression !== this.currentValue) {
				console.warn("Invalid filter expression:", this.currentValue, error);
				this.lastWarnedExpression = this.currentValue;
			}

			return false;
		}
	}
}
