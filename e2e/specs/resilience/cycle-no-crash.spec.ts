import { existsSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "../../fixtures/electron";
import {
	containsLinkTo,
	createNote,
	expectFrontmatterEventually,
	readNoteFrontmatter,
	setFrontmatter,
	waitForIndexerReady,
} from "../../fixtures/nexus-helpers";

// Cycles surface in real vaults via user error or via two notes that
// genuinely belong in both directions ("Project A relates to Project B" and
// B also relates to A). The visited-set logic in hierarchy traversal must
// prevent runaway writes; cascade artifacts (extra entries from the inverse-
// of-inverse) are tolerated as long as the system reaches a stable state.

test.describe("resilience: cyclic relationships do not run away", () => {
	test("Parent cycle A↔B — both files reach a stable state with bounded entry counts", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/A.md");
		await createNote(obsidian, "Notes/B.md");
		await waitForIndexerReady(obsidian, 2);

		await setFrontmatter(obsidian, "Notes/A.md", { Parent: ["[[B]]"] });
		await expectFrontmatterEventually(obsidian, "Notes/B.md", "Child", (v) => containsLinkTo(v, "A"));

		await setFrontmatter(obsidian, "Notes/B.md", { Parent: ["[[A]]"] });
		await expectFrontmatterEventually(obsidian, "Notes/A.md", "Child", (v) => containsLinkTo(v, "B"));

		const a = readNoteFrontmatter(obsidian, "Notes/A.md");
		const b = readNoteFrontmatter(obsidian, "Notes/B.md");

		// Both files exist and contain the expected cross-references. We use
		// containsLinkTo because cycle cascades produce extra entries
		// (`[[B]]` AND `[[Notes/B|B]]`) due to the bidirectional sync running
		// on the inverse write — see PropertiesManager.handleFileModification.
		expect(containsLinkTo(a["Parent"], "B")).toBe(true);
		expect(containsLinkTo(b["Parent"], "A")).toBe(true);
		expect(containsLinkTo(a["Child"], "B")).toBe(true);
		expect(containsLinkTo(b["Child"], "A")).toBe(true);

		// Bounded: each property contains at most 2 entries — one from the
		// user's setFrontmatter and one from the cascade. If a future refactor
		// blows this past 2, the cascade has gone unbounded.
		expect((a["Parent"] as string[]).length).toBeLessThanOrEqual(2);
		expect((a["Child"] as string[]).length).toBeLessThanOrEqual(2);
		expect((b["Parent"] as string[]).length).toBeLessThanOrEqual(2);
		expect((b["Child"] as string[]).length).toBeLessThanOrEqual(2);
	});

	test("Related cycle Alice↔Bob — touching one side does not unboundedly duplicate the other", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/Alice.md");
		await createNote(obsidian, "Notes/Bob.md");
		await waitForIndexerReady(obsidian, 2);

		await setFrontmatter(obsidian, "Notes/Alice.md", { Related: ["[[Bob]]"] });
		await expectFrontmatterEventually(obsidian, "Notes/Bob.md", "Related", (v) => containsLinkTo(v, "Alice"));

		// Touch Alice via an unrelated key — fires another file-changed event.
		await setFrontmatter(obsidian, "Notes/Alice.md", { touch: Date.now() });
		await expectFrontmatterEventually(obsidian, "Notes/Alice.md", "touch", (v) => typeof v === "number");

		const aliceRelated = readNoteFrontmatter(obsidian, "Notes/Alice.md")["Related"] as string[];
		const bobRelated = readNoteFrontmatter(obsidian, "Notes/Bob.md")["Related"] as string[];

		// Both sides contain the other, by basename or full path.
		expect(containsLinkTo(aliceRelated, "Bob")).toBe(true);
		expect(containsLinkTo(bobRelated, "Alice")).toBe(true);

		// Bounded — Related is symmetric, so cascades can add the inverse-of-
		// inverse, but the count must stay tight (<=2 each side).
		expect(aliceRelated.length).toBeLessThanOrEqual(2);
		expect(bobRelated.length).toBeLessThanOrEqual(2);
	});

	test("3-node cycle A→B→C→A — terminates with bounded entries on every node", async ({ obsidian }) => {
		await createNote(obsidian, "Notes/A.md");
		await createNote(obsidian, "Notes/B.md");
		await createNote(obsidian, "Notes/C.md");
		await waitForIndexerReady(obsidian, 3);

		await setFrontmatter(obsidian, "Notes/A.md", { Parent: ["[[B]]"] });
		await setFrontmatter(obsidian, "Notes/B.md", { Parent: ["[[C]]"] });
		await setFrontmatter(obsidian, "Notes/C.md", { Parent: ["[[A]]"] });

		await expectFrontmatterEventually(obsidian, "Notes/B.md", "Child", (v) => containsLinkTo(v, "A"));
		await expectFrontmatterEventually(obsidian, "Notes/C.md", "Child", (v) => containsLinkTo(v, "B"));
		await expectFrontmatterEventually(obsidian, "Notes/A.md", "Child", (v) => containsLinkTo(v, "C"));

		// All three files exist (no file was deleted in the cycle resolution).
		expect(existsSync(join(obsidian.vaultDir, "Notes/A.md"))).toBe(true);
		expect(existsSync(join(obsidian.vaultDir, "Notes/B.md"))).toBe(true);
		expect(existsSync(join(obsidian.vaultDir, "Notes/C.md"))).toBe(true);

		// Each Child has the expected forward link plus at most one cascade
		// artifact. If the system were running away, this would be N>>3.
		const a = readNoteFrontmatter(obsidian, "Notes/A.md");
		const b = readNoteFrontmatter(obsidian, "Notes/B.md");
		const c = readNoteFrontmatter(obsidian, "Notes/C.md");
		expect((a["Child"] as string[]).length).toBeLessThanOrEqual(2);
		expect((b["Child"] as string[]).length).toBeLessThanOrEqual(2);
		expect((c["Child"] as string[]).length).toBeLessThanOrEqual(2);
	});
});
