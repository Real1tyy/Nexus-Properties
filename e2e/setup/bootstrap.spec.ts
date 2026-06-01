import { PLUGIN_ID } from "../fixtures/constants";
import { bootstrapObsidian, expect, test } from "../fixtures/electron";
import type { NexusWindow } from "../fixtures/window-types";

test.describe("bootstrap", () => {
	test("obsidian launches with nexus-properties ready", async () => {
		const ob = await bootstrapObsidian({ prefix: "bootstrap" });

		try {
			const summary = await ob.page.evaluate((id) => {
				const w = window as unknown as NexusWindow;
				const plugin = w.app.plugins.plugins[id] as
					| {
							manifest?: { version?: string };
							indexer?: unknown;
							propertiesManager?: unknown;
							nodeCreator?: unknown;
							commandManager?: unknown;
					  }
					| undefined;
				return {
					pluginLoaded: Boolean(plugin),
					version: plugin?.manifest?.version ?? null,
					hasIndexer: Boolean(plugin?.indexer),
					hasPropertiesManager: Boolean(plugin?.propertiesManager),
					hasNodeCreator: Boolean(plugin?.nodeCreator),
					hasCommandManager: Boolean(plugin?.commandManager),
					nexusCommands: Object.keys(w.app.commands.commands).filter((c) => c.startsWith(`${id}:`)),
				};
			}, PLUGIN_ID);

			expect(summary.pluginLoaded, "nexus-properties must be loaded").toBe(true);
			expect(summary.hasIndexer, "indexer must be initialized").toBe(true);
			expect(summary.hasPropertiesManager, "PropertiesManager must be initialized").toBe(true);
			expect(summary.hasNodeCreator, "NodeCreator must be initialized").toBe(true);
			expect(summary.hasCommandManager, "CommandManager must be initialized").toBe(true);
			expect(
				summary.nexusCommands.length,
				"nexus-properties should register at least the toggle-view + node-creation commands"
			).toBe(16);
		} finally {
			await ob.close();
		}
	});
});
