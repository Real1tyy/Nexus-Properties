import { BaseEvaluator, type BaseRule } from "@real1ty-obsidian-plugins/utils/evaluator-base";
import type { NexusPropertiesSettings } from "../types/settings";

export interface FilterRule extends BaseRule {}

export class FilterEvaluator extends BaseEvaluator<FilterRule, NexusPropertiesSettings> {
	protected extractRules(settings: NexusPropertiesSettings): FilterRule[] {
		const expressions = settings.filterExpressions ?? [];
		return expressions.map((expression, index) => ({
			id: `filter-${index}`,
			expression,
			enabled: true,
		}));
	}

	// Returns true if the item should be included (passes all filters)
	evaluateFilters(frontmatter: Record<string, unknown>): boolean {
		if (this.compiledRules.length === 0) {
			return true;
		}

		return this.compiledRules.every((rule) => this.isTruthy(this.evaluateRule(rule, frontmatter)));
	}
}
