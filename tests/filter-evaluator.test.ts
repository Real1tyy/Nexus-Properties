import { BehaviorSubject } from "rxjs";
import { describe, expect, it } from "vitest";
import { type NexusPropertiesSettings, NexusPropertiesSettingsSchema } from "../src/types/settings";
import { FilterEvaluator } from "../src/utils/filters";

function makeSettings(expressions: string[]): NexusPropertiesSettings {
	return NexusPropertiesSettingsSchema.parse({ filterExpressions: expressions });
}

describe("FilterEvaluator", () => {
	it("returns true when no rules are defined", () => {
		const settings = makeSettings([]);
		const settings$ = new BehaviorSubject(settings);
		const evaluator = new FilterEvaluator(settings$);

		expect(evaluator.evaluateFilters({ Status: "Anything" })).toBe(true);
	});

	it("returns true when all rules evaluate to true", () => {
		const settings = makeSettings(["fm.Status === 'Archived'", "fm.private === true"]);
		const settings$ = new BehaviorSubject(settings);
		const evaluator = new FilterEvaluator(settings$);

		const fm = { Status: "Archived", private: true } as Record<string, unknown>;
		expect(evaluator.evaluateFilters(fm)).toBe(true);
	});

	it("returns false when any rule evaluates to false", () => {
		const settings = makeSettings(["fm.Status === 'Archived'", "fm.private === true"]);
		const settings$ = new BehaviorSubject(settings);
		const evaluator = new FilterEvaluator(settings$);

		const fm = { Status: "Active", private: true } as Record<string, unknown>;
		expect(evaluator.evaluateFilters(fm)).toBe(false);
	});
});
