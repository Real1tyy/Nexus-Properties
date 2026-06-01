import { expect, test } from "../../fixtures/electron";
import {
	expectFrontmatterEventually,
	readNoteFrontmatter,
	seedNote,
	triggerRescan,
} from "../../fixtures/nexus-helpers";

test.describe("bidirectional parent ↔ child sync", () => {
	test("adding a Parent link to a new note writes the inverse Child link on the parent", async ({ obsidian }) => {
		// Arrange: seed two notes — Parent has no children yet, Child declares Parent as Parent.
		seedNote(obsidian, "Notes/Parent.md", {});
		seedNote(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });

		// Act: trigger a full rescan so the manager processes both files.
		await triggerRescan(obsidian);

		// Assert: Parent's Child property now contains [[Child]] on disk.
		await expectFrontmatterEventually(
			obsidian,
			"Notes/Parent.md",
			"Child",
			(value) => Array.isArray(value) && value.includes("[[Child]]")
		);

		const mom = readNoteFrontmatter(obsidian, "Notes/Parent.md");
		expect(mom["Child"]).toEqual(["[[Child]]"]);
	});

	test("Child's Parent link survives — manager only writes inverse, never alters the source", async ({ obsidian }) => {
		seedNote(obsidian, "Notes/Parent.md", {});
		seedNote(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });

		await triggerRescan(obsidian);

		await expectFrontmatterEventually(
			obsidian,
			"Notes/Parent.md",
			"Child",
			(value) => Array.isArray(value) && value.length === 1
		);

		const kid = readNoteFrontmatter(obsidian, "Notes/Child.md");
		expect(kid["Parent"]).toEqual(["[[Parent]]"]);
	});
});
