import { PLUGIN_ID } from "../../fixtures/constants";
import { expect, test } from "../../fixtures/electron";
import {
	expectFrontmatterEventually,
	readNoteFrontmatter,
	seedNote,
	triggerRescan,
} from "../../fixtures/nexus-helpers";
import type { NexusWindow } from "../../fixtures/window-types";

test.describe("deletion cleanup", () => {
	test("deleting a child removes its [[link]] from the parent's Child property", async ({ obsidian }) => {
		// Arrange: parent already references Child; both files exist on disk.
		seedNote(obsidian, "Notes/Parent.md", { Child: ["[[Child]]"] });
		seedNote(obsidian, "Notes/Child.md", { Parent: ["[[Parent]]"] });

		await triggerRescan(obsidian);

		// Act: delete the Child file through Obsidian's vault API.
		await obsidian.page.evaluate(
			async ({ id: _id, path }) => {
				const w = window as unknown as NexusWindow;
				const file = w.app.vault.getAbstractFileByPath(path);
				if (!file) throw new Error(`file not found: ${path}`);
				await w.app.vault.delete(file);
			},
			{ id: PLUGIN_ID, path: "Notes/Child.md" }
		);

		// Assert: Parent's Child property is now empty.
		await expectFrontmatterEventually(
			obsidian,
			"Notes/Parent.md",
			"Child",
			(value) => Array.isArray(value) && !value.includes("[[Child]]")
		);

		const mom = readNoteFrontmatter(obsidian, "Notes/Parent.md");
		expect(mom["Child"]).toEqual([]);
	});
});
