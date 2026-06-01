import { PLUGIN_ID } from "../../fixtures/constants";
import { expect, test } from "../../fixtures/electron";
import type { NexusWindow } from "../../fixtures/window-types";

const EXPECTED_COMMAND_IDS = [
	"toggle-relationship-graph",
	"toggle-view-mode",
	"enlarge-relationship-graph",
	"toggle-graph-search",
	"toggle-graph-filter",
	"toggle-graph-filter-preset",
	"hide-focus-node-content",
	"hide-focus-node-frontmatter",
	"center-on-source",
	"create-parent-node",
	"create-child-node",
	"create-related-node",
	"nexus-undo",
	"nexus-redo",
	"bases-view-forward",
	"bases-view-backward",
] as const;

test.describe("command palette wiring", () => {
	test("every documented command is registered with its full namespaced id", async ({ obsidian }) => {
		const registered = await obsidian.page.evaluate((id) => {
			const w = window as unknown as NexusWindow;
			return Object.keys(w.app.commands.commands)
				.filter((c) => c.startsWith(`${id}:`))
				.map((c) => c.slice(id.length + 1))
				.sort();
		}, PLUGIN_ID);

		expect(registered).toEqual([...EXPECTED_COMMAND_IDS].sort());
	});

	test("each command has a human-readable display name", async ({ obsidian }) => {
		const displayNames = await obsidian.page.evaluate((id) => {
			const w = window as unknown as NexusWindow;
			const result: Record<string, string | null> = {};
			for (const key of Object.keys(w.app.commands.commands)) {
				if (!key.startsWith(`${id}:`)) continue;
				const entry = w.app.commands.commands[key];
				result[key.slice(id.length + 1)] = entry?.name ?? null;
			}
			return result;
		}, PLUGIN_ID);

		for (const id of EXPECTED_COMMAND_IDS) {
			expect(displayNames[id], `command ${id} must have a display name`).toBeTruthy();
		}
	});
});
