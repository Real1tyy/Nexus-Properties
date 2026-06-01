import { expect, test } from "../../fixtures/electron";
import {
	containsLinkTo,
	createNote,
	expectFrontmatterEventually,
	linkTo,
	readNoteFrontmatter,
	setFrontmatter,
	waitForIndexerReady,
} from "../../fixtures/nexus-helpers";

// The production sync path: a file exists, the user edits it, the manager
// computes the diff against the previous cached state, and writes the inverse
// on the target file. Every spec below follows the same shape:
//   1. createNote() — places file in indexer cache via SEED_PLACEHOLDER_KEY
//   2. waitForIndexerReady() — indexer must have the seeded entries before edit
//   3. setFrontmatter() — fires file-changed with non-empty diff
//   4. expectFrontmatterEventually() — wait for inverse to land on disk

test.describe("bidirectional sync fires on edit", () => {
	test("adding Parent: [[Parent]] to Child writes Notes/Child back on Parent", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Parent.md");
		await createNote(obsidian, "Notes/Child.md");
		await waitForIndexerReady(obsidian);

		await setFrontmatter(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });

		await expectFrontmatterEventually(obsidian, "Notes/Parent.md", "Child", (v) => containsLinkTo(v, "Child"));
		expect(readNoteFrontmatter(obsidian, "Notes/Parent.md")["Child"]).toEqual([linkTo("Notes", "Child")]);
	});

	test("removing the Parent link from Child removes Child from Parent's Child", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Parent.md");
		await createNote(obsidian, "Notes/Child.md");
		await waitForIndexerReady(obsidian);

		await setFrontmatter(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });
		await expectFrontmatterEventually(obsidian, "Notes/Parent.md", "Child", (v) => containsLinkTo(v, "Child"));

		await setFrontmatter(obsidian, "Notes/Child.md", { Parent: [] });
		await expectFrontmatterEventually(obsidian, "Notes/Parent.md", "Child", (v) => Array.isArray(v) && v.length === 0);
		expect(readNoteFrontmatter(obsidian, "Notes/Parent.md")["Child"]).toEqual([]);
	});

	test("Related is symmetric — setting Related: [[Alice]] on Bob writes the same on Alice", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Alice.md");
		await createNote(obsidian, "Notes/Bob.md");
		await waitForIndexerReady(obsidian);

		await setFrontmatter(obsidian, "Notes/Bob.md", { Related: ["[[Alice]]"] });

		await expectFrontmatterEventually(obsidian, "Notes/Alice.md", "Related", (v) => containsLinkTo(v, "Bob"));
		expect(readNoteFrontmatter(obsidian, "Notes/Alice.md")["Related"]).toEqual([linkTo("Notes", "Bob")]);
	});
});
