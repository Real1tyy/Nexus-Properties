import { existsSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "../../fixtures/electron";
import {
	containsLinkTo,
	createNote,
	expectFrontmatterEventually,
	getIndexerSnapshotKeys,
	readNoteFrontmatter,
	setFrontmatter,
	waitForIndexerReady,
} from "../../fixtures/nexus-helpers";

// Real vaults have dead links — a user moved a file, deleted one, or never
// created the target. The manager must NOT:
//   - create a file just because someone referenced it ([[Ghost]] does not
//     conjure Ghost.md into existence)
//   - throw an error that crashes the indexer subscription
//   - corrupt the source file's frontmatter

test.describe("resilience: missing link target", () => {
	test("editing in Parent: [[Ghost]] (no Ghost.md) does not crash subsequent edits", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Child.md");
		await createNote(obsidian, "Notes/Parent.md");
		await createNote(obsidian, "Notes/Sibling.md");
		await waitForIndexerReady(obsidian);

		// First edit: dead link.
		await setFrontmatter(obsidian, "Notes/Child.md", { Parent: ["[[Ghost]]"] });

		// Second edit on an unrelated file: must still work — proof the
		// indexer subscription survived processing the broken link.
		await setFrontmatter(obsidian, "Notes/Sibling.md", { Parent: ["[[Parent]]"] });
		await expectFrontmatterEventually(obsidian, "Notes/Parent.md", "Child", (v) => containsLinkTo(v, "Sibling"));

		// Ghost.md was never conjured.
		expect(existsSync(join(obsidian.vaultDir, "Notes/Ghost.md"))).toBe(false);

		// Source frontmatter on Child is untouched.
		expect(readNoteFrontmatter(obsidian, "Notes/Child.md")["Parent"]).toEqual(["[[Ghost]]"]);

		// The indexer still tracks Child.md — its broken link doesn't disqualify it.
		const keys = await getIndexerSnapshotKeys(obsidian);
		expect(keys).toContain("Notes/Child.md");
	});

	test("editing Related: [[NonExistent]] — symmetric path also handles missing target", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Alice.md");
		await createNote(obsidian, "Notes/Parent.md");
		await createNote(obsidian, "Notes/Child.md");
		await waitForIndexerReady(obsidian);

		await setFrontmatter(obsidian, "Notes/Alice.md", { Related: ["[[NonExistent]]"] });

		// Working pair edit lands.
		await setFrontmatter(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });
		await expectFrontmatterEventually(obsidian, "Notes/Parent.md", "Child", (v) => containsLinkTo(v, "Child"));

		expect(existsSync(join(obsidian.vaultDir, "Notes/NonExistent.md"))).toBe(false);
		expect(readNoteFrontmatter(obsidian, "Notes/Alice.md")["Related"]).toEqual(["[[NonExistent]]"]);
	});
});
