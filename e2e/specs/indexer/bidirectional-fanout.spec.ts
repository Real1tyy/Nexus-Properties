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

// Fan-out + idempotence — the indexer must produce a clean inverse graph
// after a burst of edits, and re-asserting frontmatter on a child must not
// double-write inverse entries on the parent (the dedupe in addLinkToProperty).

test.describe("bidirectional sync across a fan-out + repeat edits", () => {
	test("editing 3 children to point at Root produces all three entries in Root.Child", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Root.md");
		await createNote(obsidian, "Notes/Kid1.md");
		await createNote(obsidian, "Notes/Kid2.md");
		await createNote(obsidian, "Notes/Kid3.md");
		await waitForIndexerReady(obsidian);

		await setFrontmatter(obsidian, "Notes/Kid1.md", { Parent: ["[[Root]]"] });
		await setFrontmatter(obsidian, "Notes/Kid2.md", { Parent: ["[[Root]]"] });
		await setFrontmatter(obsidian, "Notes/Kid3.md", { Parent: ["[[Root]]"] });

		await expectFrontmatterEventually(obsidian, "Notes/Root.md", "Child", (v) => Array.isArray(v) && v.length === 3);
		const root = readNoteFrontmatter(obsidian, "Notes/Root.md");
		expect((root["Child"] as string[]).sort()).toEqual(
			[linkTo("Notes", "Kid1"), linkTo("Notes", "Kid2"), linkTo("Notes", "Kid3")].sort()
		);

		// Each child's Parent declaration is preserved.
		expect(readNoteFrontmatter(obsidian, "Notes/Kid1.md")["Parent"]).toEqual(["[[Root]]"]);
		expect(readNoteFrontmatter(obsidian, "Notes/Kid2.md")["Parent"]).toEqual(["[[Root]]"]);
		expect(readNoteFrontmatter(obsidian, "Notes/Kid3.md")["Parent"]).toEqual(["[[Root]]"]);
	});

	test("touching Child with an unrelated frontmatter key does not duplicate Parent.Child", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Parent.md");
		await createNote(obsidian, "Notes/Child.md");
		await waitForIndexerReady(obsidian);

		// Establish the relationship.
		await setFrontmatter(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });
		await expectFrontmatterEventually(obsidian, "Notes/Parent.md", "Child", (v) => containsLinkTo(v, "Child"));

		// Edit Child again with an unrelated key. Fires a fresh file-changed
		// whose diff does NOT touch Parent. Manager must NOT re-append [[Child]]
		// to Parent.Child.
		await setFrontmatter(obsidian, "Notes/Child.md", { Status: "active" });
		await expectFrontmatterEventually(obsidian, "Notes/Child.md", "Status", (v) => v === "active");

		expect(readNoteFrontmatter(obsidian, "Notes/Parent.md")["Child"]).toEqual([linkTo("Notes", "Child")]);
	});
});
