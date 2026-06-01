import { expect, test } from "../../fixtures/electron";
import {
	expectFrontmatterEventually,
	readNoteFrontmatter,
	seedNote,
	triggerRescan,
} from "../../fixtures/nexus-helpers";

test.describe("symmetric Related sync", () => {
	test("declaring Related: [[Alice]] on Bob writes Related: [[Bob]] back on Alice", async ({ obsidian }) => {
		seedNote(obsidian, "Notes/Alice.md", {});
		seedNote(obsidian, "Notes/Bob.md", { Related: ["[[Alice]]"] });

		await triggerRescan(obsidian);

		await expectFrontmatterEventually(
			obsidian,
			"Notes/Alice.md",
			"Related",
			(value) => Array.isArray(value) && value.includes("[[Bob]]")
		);

		const alice = readNoteFrontmatter(obsidian, "Notes/Alice.md");
		expect(alice["Related"]).toEqual(["[[Bob]]"]);
	});
});
