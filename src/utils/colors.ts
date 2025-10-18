import { BaseEvaluator, type BaseRule } from "@real1ty-obsidian-plugins/utils/evaluator-base";
import type { NexusPropertiesSettings } from "../types/settings";

export interface ColorRule extends BaseRule {
	color: string;
}

export class ColorEvaluator extends BaseEvaluator<ColorRule, NexusPropertiesSettings> {
	private defaultColor: string;

	constructor(settingsObservable: any) {
		super(settingsObservable);
		this.defaultColor = settingsObservable.value.defaultNodeColor;

		settingsObservable.subscribe((settings: NexusPropertiesSettings) => {
			if (settings.defaultNodeColor) {
				this.defaultColor = settings.defaultNodeColor;
			}
		});
	}

	protected extractRules(settings: NexusPropertiesSettings): ColorRule[] {
		return settings.colorRules;
	}

	evaluateColor(frontmatter: Record<string, unknown>): string {
		const match = this.compiledRules.find((rule) => this.isTruthy(this.evaluateRule(rule, frontmatter)));
		return match?.color ?? this.defaultColor;
	}
}
