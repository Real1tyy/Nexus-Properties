import { expect, test } from "../../fixtures/electron";
import {
	expectFrontmatterEventually,
	readNoteFrontmatter,
	seedNote,
	triggerRescan,
} from "../../fixtures/nexus-helpers";

test.describe("auto-link siblings", () => {
	test("two notes sharing the same parent become Related to each other", async ({ obsidian }) => {
		// Parent has two declared children; the manager should mark them as siblings
		// (related to each other) once auto-link is on (default).
		seedNote(obsidian, "Notes/Parent.md", { Child: ["[[A]]", "[[B]]"] });
		seedNote(obsidian, "Notes/A.md", { Parent: ["[[Parent]]"] });
		seedNote(obsidian, "Notes/B.md", { Parent: ["[[Parent]]"] });

		await triggerRescan(obsidian);

		await expectFrontmatterEventually(
			obsidian,
			"Notes/A.md",
			"Related",
			(value) => Array.isArray(value) && value.includes("[[B]]")
		);

		const a = readNoteFrontmatter(obsidian, "Notes/A.md");
		const b = readNoteFrontmatter(obsidian, "Notes/B.md");
		expect(a["Related"]).toEqual(["[[B]]"]);
		expect(b["Related"]).toEqual(["[[A]]"]);
	});
});
