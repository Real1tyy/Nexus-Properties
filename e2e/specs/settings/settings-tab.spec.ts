import { openSettingsTab } from "@real1ty-obsidian-plugins/testing/e2e";

import { PLUGIN_ID } from "../../fixtures/constants";
import { expect, test } from "../../fixtures/electron";

test.describe("settings tab", () => {
	test("opening the settings dialog reveals the Nexus tab with the React navigation", async ({ obsidian }) => {
		// Act: open the plugin's settings tab via the standard helper.
		await openSettingsTab(obsidian.page, "Nexus Properties");

		// Assert: the React SettingsNav rendered all 7 known tab buttons.
		const expectedTabs = ["General", "Properties", "Graph", "Bases", "MOC", "Rules", "Statistics"];
		for (const label of expectedTabs) {
			await expect(obsidian.page.getByRole("button", { name: label }).first()).toBeVisible();
		}
	});

	test("plugin id is wired correctly so commands resolve to display strings", async ({ obsidian }) => {
		// This guards against accidentally changing manifest.json's id field —
		// a regression here would silently break every command-palette invocation.
		const manifestId = await obsidian.page.evaluate((id) => {
			const w = window as unknown as { app: { plugins: { plugins: Record<string, { manifest?: { id?: string } }> } } };
			return w.app.plugins.plugins[id]?.manifest?.id ?? null;
		}, PLUGIN_ID);

		expect(manifestId).toBe(PLUGIN_ID);
	});
});
