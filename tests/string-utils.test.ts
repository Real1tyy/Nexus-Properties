import { describe, expect, it } from "vitest";
import { stripParentPrefix } from "../src/utils/string-utils";

describe("stripParentPrefix", () => {
	describe("pattern 1: parent name + space", () => {
		it("should strip parent name followed by space", () => {
			expect(stripParentPrefix("Females Addictions", "Females")).toBe("Addictions");
		});

		it("should strip parent name followed by space with multiple words", () => {
			expect(stripParentPrefix("Females Psychology How Woman Bond", "Females")).toBe("Psychology How Woman Bond");
		});

		it("should strip parent name followed by space for single word child", () => {
			expect(stripParentPrefix("Females Sex", "Females")).toBe("Sex");
		});
	});

	describe("pattern 2: parent name + ' - ' (dash with spaces)", () => {
		it("should strip parent name followed by dash with spaces", () => {
			expect(stripParentPrefix("Cold Approaching - Only Repels", "Cold Approaching")).toBe("Only Repels");
		});

		it("should strip parent name followed by dash with spaces for long child name", () => {
			expect(
				stripParentPrefix(
					"Cold Approaching - Check - Signals Signs She Wants You Not All Touches Flirtation, Polarity",
					"Cold Approaching"
				)
			).toBe("Check - Signals Signs She Wants You Not All Touches Flirtation, Polarity");
		});

		it("should strip parent name followed by dash with spaces for single word child", () => {
			expect(stripParentPrefix("Cold Approaching - Teasing", "Cold Approaching")).toBe("Teasing");
		});
	});

	describe("pattern 3: parent name + '-' (dash without spaces)", () => {
		it("should strip parent name followed by dash without spaces", () => {
			expect(stripParentPrefix("Cold Approaching-Real1ty", "Cold Approaching")).toBe("Real1ty");
		});

		it("should strip parent name followed by dash without spaces for multiple words", () => {
			expect(stripParentPrefix("Females-Bratislava Vaping", "Females")).toBe("Bratislava Vaping");
		});
	});

	describe("pattern 4: parent name + en-dash/em-dash", () => {
		it("should strip parent name followed by en-dash with spaces", () => {
			expect(stripParentPrefix("Cold Approaching – Gamify Mindset", "Cold Approaching")).toBe("Gamify Mindset");
		});

		it("should strip parent name followed by en-dash without spaces", () => {
			expect(stripParentPrefix("Parent–Child", "Parent")).toBe("Child");
		});

		it("should strip parent name followed by em-dash with spaces", () => {
			expect(stripParentPrefix("Parent — Child", "Parent")).toBe("Child");
		});

		it("should strip parent name followed by em-dash without spaces", () => {
			expect(stripParentPrefix("Parent—Child", "Parent")).toBe("Child");
		});

		it("should handle space then en-dash pattern", () => {
			expect(stripParentPrefix("Cold Approaching – Only Repels", "Cold Approaching")).toBe("Only Repels");
		});
	});

	describe("edge cases", () => {
		it("should return original name if parent name is empty", () => {
			expect(stripParentPrefix("Some Name", "")).toBe("Some Name");
		});

		it("should return original name if parent name does not match", () => {
			expect(stripParentPrefix("Unrelated Name", "Parent")).toBe("Unrelated Name");
		});

		it("should return original name if display name is empty", () => {
			expect(stripParentPrefix("", "Parent")).toBe("");
		});

		it("should return original name if display name equals parent name", () => {
			expect(stripParentPrefix("Females", "Females")).toBe("Females");
		});

		it("should return original name if display name only starts with parent name but no separator", () => {
			expect(stripParentPrefix("FemalesAddictions", "Females")).toBe("FemalesAddictions");
		});

		it("should handle parent name with special characters", () => {
			expect(stripParentPrefix("Parent (2024) - Child", "Parent (2024)")).toBe("Child");
		});

		it("should handle case-sensitive matching", () => {
			expect(stripParentPrefix("females Addictions", "Females")).toBe("females Addictions");
		});

		it("should handle multiple dashes in pattern 2", () => {
			expect(stripParentPrefix("Parent - Child - Grandchild", "Parent")).toBe("Child - Grandchild");
		});

		it("should prioritize pattern 2 over pattern 1 when both could match", () => {
			// "Parent - " should match pattern 2, not pattern 1
			expect(stripParentPrefix("Parent - Child", "Parent")).toBe("Child");
		});

		it("should return original if only whitespace remains after stripping", () => {
			// When stripping leaves only whitespace, return original to avoid empty titles
			expect(stripParentPrefix("Parent   ", "Parent")).toBe("Parent   ");
		});
	});

	describe("real-world examples", () => {
		it("should handle 'Females' parent with various children", () => {
			expect(stripParentPrefix("Females Addictions", "Females")).toBe("Addictions");
			expect(stripParentPrefix("Females Biology", "Females")).toBe("Biology");
			expect(stripParentPrefix("Females Dates", "Females")).toBe("Dates");
			expect(stripParentPrefix("Females Sex", "Females")).toBe("Sex");
		});

		it("should handle 'Cold Approaching' parent with various children", () => {
			expect(stripParentPrefix("Cold Approaching - Only Repels", "Cold Approaching")).toBe("Only Repels");
			expect(stripParentPrefix("Cold Approaching Real1ty", "Cold Approaching")).toBe("Real1ty");
			expect(stripParentPrefix("Cold Approaching-Real1ty", "Cold Approaching")).toBe("Real1ty");
		});
	});
});
