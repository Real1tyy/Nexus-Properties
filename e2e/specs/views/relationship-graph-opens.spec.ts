import { executeCommand } from "@real1ty-obsidian-plugins/testing/e2e";

import { PLUGIN_ID } from "../../fixtures/constants";
import { expect, test } from "../../fixtures/electron";
import type { NexusWindow } from "../../fixtures/window-types";

const VIEW_TYPE_NEXUS_SWITCHER = "nexus-view-switcher";

test.describe("relationship graph view lifecycle", () => {
	test("`toggle-relationship-graph` command opens the Nexus view in a sidebar leaf", async ({ obsidian }) => {
		// Precondition: no Nexus view open.
		const before = await obsidian.page.evaluate(
			({ type }) => {
				const w = window as unknown as NexusWindow;
				return w.app.workspace.getLeavesOfType(type).length;
			},
			{ type: VIEW_TYPE_NEXUS_SWITCHER }
		);
		expect(before).toBe(0);

		// Act: dispatch the public command (same path the command palette uses).
		await executeCommand(obsidian.page, `${PLUGIN_ID}:toggle-relationship-graph`);

		// Assert: exactly one Nexus view leaf is present.
		await obsidian.page.waitForFunction(
			({ type }) => {
				const w = window as unknown as NexusWindow;
				return w.app.workspace.getLeavesOfType(type).length === 1;
			},
			{ type: VIEW_TYPE_NEXUS_SWITCHER }
		);

		const after = await obsidian.page.evaluate(
			({ type }) => {
				const w = window as unknown as NexusWindow;
				return w.app.workspace.getLeavesOfType(type).length;
			},
			{ type: VIEW_TYPE_NEXUS_SWITCHER }
		);
		expect(after).toBe(1);
	});
});
