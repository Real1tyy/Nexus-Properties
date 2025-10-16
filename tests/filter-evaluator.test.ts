import { describe, it, expect } from "vitest";
import { BehaviorSubject } from "rxjs";
import { FilterEvaluator } from "../src/utils/filters";
import { NexusPropertiesSettingsSchema, type NexusPropertiesSettings } from "../src/types/settings";

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
