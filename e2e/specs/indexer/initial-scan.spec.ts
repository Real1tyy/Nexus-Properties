import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, test } from "../../fixtures/electron";
import {
	containsLinkTo,
	createNote,
	expectFrontmatterEventually,
	getIndexerSnapshotKeys,
	linkTo,
	readNoteFrontmatter,
	waitForIndexerReady,
} from "../../fixtures/nexus-helpers";

// The indexer's job at boot is to make every relevant file visible in its
// snapshot — that's the precondition for every later event (edit, delete,
// rename) to be observable as a *diff* rather than a brand-new entry.
//
// Bidirectional sync also fires on the *first* sight of a file: a note that
// already declares a relationship when the plugin first scans it gets its
// inverse written immediately, so installing the plugin on an existing vault
// backfills the missing inverse links without the user re-editing each note.

test.describe("indexer initial scan", () => {
	test("every created note ends up in the indexer's snapshot", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Parent.md");
		await createNote(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });
		await createNote(obsidian, "Notes/Alice.md");

		await waitForIndexerReady(obsidian);

		const keys = await getIndexerSnapshotKeys(obsidian);
		expect(keys).toContain("Notes/Parent.md");
		expect(keys).toContain("Notes/Child.md");
		expect(keys).toContain("Notes/Alice.md");
	});

	test("a note with no frontmatter envelope at all is not picked up but does not crash the scan", async ({
		obsidian,
	}) => {
		// Bypass Obsidian's vault APIs: write a plain markdown file with NO
		// frontmatter block. Obsidian's metadataCache never fires `changed`
		// for such a file, so it never enters the indexer's snapshot. This
		// pins the current behaviour as a regression guard — refactors that
		// start scanning plain files unprompted must update this spec.
		const absolute = join(obsidian.vaultDir, "Notes", "Solo.md");
		mkdirSync(dirname(absolute), { recursive: true });
		writeFileSync(absolute, "# Standalone note\n\nNo relationships here.", "utf8");

		// Seed a separate API-created note so `waitForIndexerReady` has a
		// positive signal.
		await createNote(obsidian, "Notes/Other.md");
		await waitForIndexerReady(obsidian);

		expect(() => readNoteFrontmatter(obsidian, "Notes/Solo.md")).not.toThrow();
		expect(readNoteFrontmatter(obsidian, "Notes/Solo.md")).toEqual({});

		// Solo.md is not in the indexer snapshot (no frontmatter to parse).
		const keys = await getIndexerSnapshotKeys(obsidian);
		expect(keys).not.toContain("Notes/Solo.md");
	});

	test("first sight of a note declaring a Parent writes the inverse Child on the target", async ({ obsidian }) => {
		// A note created with a relationship already in its frontmatter must get
		// its inverse written on the very first scan — no second edit required.
		await createNote(obsidian, "Notes/Parent.md");
		await createNote(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });

		await waitForIndexerReady(obsidian);

		await expectFrontmatterEventually(obsidian, "Notes/Parent.md", "Child", (v) => containsLinkTo(v, "Child"));
		expect(readNoteFrontmatter(obsidian, "Notes/Parent.md")["Child"]).toEqual([linkTo("Notes", "Child")]);
	});
});
