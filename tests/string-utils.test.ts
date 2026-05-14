import { describe, expect, it } from "vitest";

import { replaceParentPrefix, stripParentPrefix } from "../src/utils/string-utils";

describe("stripParentPrefix", () => {
	describe("pattern 1: parent name + space", () => {
		it("should strip parent name followed by space", () => {
			expect(stripParentPrefix("Technology Programming", "Technology")).toBe("Programming");
		});

		it("should strip parent name followed by space with multiple words", () => {
			expect(stripParentPrefix("Technology Web Development Best Practices", "Technology")).toBe(
				"Web Development Best Practices"
			);
		});

		it("should strip parent name followed by space for single word child", () => {
			expect(stripParentPrefix("Technology Security", "Technology")).toBe("Security");
		});
	});

	describe("pattern 2: parent name + ' - ' (dash with spaces)", () => {
		it("should strip parent name followed by dash with spaces", () => {
			expect(stripParentPrefix("Sports - Basketball", "Sports")).toBe("Basketball");
		});

		it("should strip parent name followed by dash with spaces for long child name", () => {
			expect(stripParentPrefix("Sports - Training - Advanced Techniques For Team Coordination", "Sports")).toBe(
				"Training - Advanced Techniques For Team Coordination"
			);
		});

		it("should strip parent name followed by dash with spaces for single word child", () => {
			expect(stripParentPrefix("Sports - Swimming", "Sports")).toBe("Swimming");
		});
	});

	describe("pattern 3: parent name + '-' (dash without spaces)", () => {
		it("should strip parent name followed by dash without spaces", () => {
			expect(stripParentPrefix("Sports-Soccer", "Sports")).toBe("Soccer");
		});

		it("should strip parent name followed by dash without spaces for multiple words", () => {
			expect(stripParentPrefix("Technology-Machine Learning", "Technology")).toBe("Machine Learning");
		});
	});

	describe("pattern 4: parent name + en-dash/em-dash", () => {
		it("should strip parent name followed by en-dash with spaces", () => {
			expect(stripParentPrefix("Science – Biology", "Science")).toBe("Biology");
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
			expect(stripParentPrefix("Science – Chemistry", "Science")).toBe("Chemistry");
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
			expect(stripParentPrefix("Technology", "Technology")).toBe("Technology");
		});

		it("should return original name if display name only starts with parent name but no separator", () => {
			expect(stripParentPrefix("TechnologyProgramming", "Technology")).toBe("TechnologyProgramming");
		});

		it("should handle parent name with special characters", () => {
			expect(stripParentPrefix("Parent (2024) - Child", "Parent (2024)")).toBe("Child");
		});

		it("should handle case-sensitive matching", () => {
			expect(stripParentPrefix("technology Programming", "Technology")).toBe("technology Programming");
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
		it("should handle 'Technology' parent with various children", () => {
			expect(stripParentPrefix("Technology Programming", "Technology")).toBe("Programming");
			expect(stripParentPrefix("Technology Security", "Technology")).toBe("Security");
			expect(stripParentPrefix("Technology Database", "Technology")).toBe("Database");
			expect(stripParentPrefix("Technology Cloud", "Technology")).toBe("Cloud");
		});

		it("should handle 'Sports' parent with various children", () => {
			expect(stripParentPrefix("Sports - Basketball", "Sports")).toBe("Basketball");
			expect(stripParentPrefix("Sports Soccer", "Sports")).toBe("Soccer");
			expect(stripParentPrefix("Sports-Tennis", "Sports")).toBe("Tennis");
		});
	});
});

describe("replaceParentPrefix", () => {
	describe("basic replacements", () => {
		it("should replace parent prefix with dash separator", () => {
			expect(replaceParentPrefix("Project - Task 1", "Project", "Initiative")).toBe("Initiative - Task 1");
		});

		it("should replace parent prefix with space separator", () => {
			expect(replaceParentPrefix("Project Task 1", "Project", "Initiative")).toBe("Initiative Task 1");
		});

		it("should replace parent prefix with dash-no-space separator", () => {
			expect(replaceParentPrefix("Project-Feature", "Project", "Initiative")).toBe("Initiative-Feature");
		});

		it("should replace parent prefix with en-dash separator", () => {
			expect(replaceParentPrefix("Project – Task 1", "Project", "Initiative")).toBe("Initiative – Task 1");
		});

		it("should replace parent prefix with em-dash separator", () => {
			expect(replaceParentPrefix("Project — Task 1", "Project", "Initiative")).toBe("Initiative — Task 1");
		});
	});

	describe("preserves separator and remainder", () => {
		it("should preserve the exact separator characters", () => {
			expect(replaceParentPrefix("Alpha - Beta - Gamma", "Alpha", "Omega")).toBe("Omega - Beta - Gamma");
		});

		it("should preserve multiple words after separator", () => {
			expect(replaceParentPrefix("Team Weekly Review Notes", "Team", "Group")).toBe("Group Weekly Review Notes");
		});
	});

	describe("returns null for non-matching inputs", () => {
		it("should return null when display name does not start with old parent name", () => {
			expect(replaceParentPrefix("Unrelated Note", "Project", "Initiative")).toBeNull();
		});

		it("should return null when old parent name is empty", () => {
			expect(replaceParentPrefix("Some Name", "", "New")).toBeNull();
		});

		it("should return null when there is no separator after parent name", () => {
			expect(replaceParentPrefix("ProjectExtra", "Project", "Initiative")).toBeNull();
		});

		it("should return null for exact match without separator", () => {
			expect(replaceParentPrefix("Project", "Project", "Initiative")).toBeNull();
		});

		it("should return null for case-sensitive mismatch", () => {
			expect(replaceParentPrefix("project - Task", "Project", "Initiative")).toBeNull();
		});
	});

	describe("edge cases", () => {
		it("should handle parent names with special characters", () => {
			expect(replaceParentPrefix("Team (2024) - Review", "Team (2024)", "Team (2025)")).toBe("Team (2025) - Review");
		});

		it("should handle renaming to a longer name", () => {
			expect(replaceParentPrefix("A - Child", "A", "LongNewName")).toBe("LongNewName - Child");
		});

		it("should handle renaming to a shorter name", () => {
			expect(replaceParentPrefix("LongParentName - Child", "LongParentName", "X")).toBe("X - Child");
		});
	});
});
