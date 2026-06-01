import { existsSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { bootstrapObsidian } from "../../fixtures/electron";
import {
	containsLinkTo,
	createNote,
	expectFrontmatterEventually,
	getIndexerSnapshotKeys,
	linkTo,
	readNoteFrontmatter,
	seedNote,
	setFrontmatter,
	waitForIndexerReady,
} from "../../fixtures/nexus-helpers";

// Boot with `directories: ["Notes"]`. Files outside the configured directory
// must be invisible to the indexer end-to-end: no entry in the snapshot, no
// inverse-link writes.
//
// Uses raw playwright test + manual bootstrap (instead of the `obsidian`
// fixture) so we can override `pluginData.directories` before plugin load.

test.describe("indexer directory filter", () => {
	test("inside-dir edits get bidirectional sync; outside-dir files are entirely ignored", async () => {
		const ob = await bootstrapObsidian({
			prefix: "dir-filter",
			overrides: {
				pluginData: { directories: ["Notes"] },
				keepDirs: ["Notes", "Outside"],
			},
		});

		try {
			// Inside the indexed directory: create + edit pattern fires sync.
			await createNote(ob, "Notes/Parent.md");
			await createNote(ob, "Notes/Child.md");
			await waitForIndexerReady(ob);
			await setFrontmatter(ob, "Notes/Child.md", { Parent: ["[[Parent]]"] });

			// Outside: an "orphan" pair seeded via raw writeFileSync because
			// the point is that the indexer must NOT see them — going through
			// `vault.create` would defeat the test.
			seedNote(ob, "Outside/Boss.md");
			seedNote(ob, "Outside/Report.md", { Parent: ["[[Boss]]"] });

			// Inside pair: bidirectional sync fires.
			await expectFrontmatterEventually(ob, "Notes/Parent.md", "Child", (v) => containsLinkTo(v, "Child"));
			expect(readNoteFrontmatter(ob, "Notes/Parent.md")["Child"]).toEqual([linkTo("Notes", "Child")]);

			// Outside pair: no inverse on Boss.
			expect(readNoteFrontmatter(ob, "Outside/Boss.md")["Child"]).toBeUndefined();

			// Snapshot proves the filter: only Notes/* paths are indexed.
			const keys = await getIndexerSnapshotKeys(ob);
			expect(keys).toContain("Notes/Parent.md");
			expect(keys).toContain("Notes/Child.md");
			expect(keys).not.toContain("Outside/Boss.md");
			expect(keys).not.toContain("Outside/Report.md");

			// Outside files still exist on disk — indexer skipping is silent.
			expect(existsSync(join(ob.vaultDir, "Outside/Boss.md"))).toBe(true);
			expect(existsSync(join(ob.vaultDir, "Outside/Report.md"))).toBe(true);
		} finally {
			await ob.close();
		}
	});
});
