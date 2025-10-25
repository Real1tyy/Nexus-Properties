import type { BehaviorSubject } from "rxjs";
import type { NexusPropertiesSettings } from "../types/settings";
import { BaseEvaluator, type BaseRule } from "./base-evaluator";

export interface ColorRule extends BaseRule {
	color: string;
}

export class ColorEvaluator extends BaseEvaluator<ColorRule, NexusPropertiesSettings> {
	private defaultColor: string;

	constructor(settingsStore: BehaviorSubject<NexusPropertiesSettings>) {
		super(settingsStore);
		this.defaultColor = settingsStore.value.defaultNodeColor;

		settingsStore.subscribe((settings) => {
			if (settings.defaultNodeColor) {
				this.defaultColor = settings.defaultNodeColor;
			}
		});
	}

	protected extractRules(settings: NexusPropertiesSettings): ColorRule[] {
		return settings.colorRules;
	}

	evaluateColor(frontmatter: Record<string, unknown>): string {
		const match = this.rules.find((rule) => this.isTruthy(this.evaluateRule(rule, frontmatter)));
		return match?.color ?? this.defaultColor;
	}
}
