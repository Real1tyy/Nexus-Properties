import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { test as base, type Page } from "@playwright/test";
import {
	createConsoleErrorGuard,
	createPluginE2eHarness,
	bootstrapObsidian as sharedBootstrap,
	writeStandardAppJson,
	type BootstrappedObsidian,
} from "@real1ty-obsidian-plugins/testing/e2e";

import { E2E_ROOT, PLUGIN_ID, PLUGIN_ROOT } from "./constants";
import type { NexusWindow } from "./window-types";

const harness = createPluginE2eHarness({ e2eRoot: E2E_ROOT });

// Pre-seed data.json so:
//   - title-property setup modal never fires on first boot (mode: "disabled"
//     instead of the default "unknown" which prompts the user)
//   - version matches manifest version so the What's New modal is suppressed
const DEFAULT_PLUGIN_DATA: Record<string, unknown> = {
	titlePropertyMode: "disabled",
};

const HEADED_VISIBLE = process.env["E2E_HEADED"] === "1";

export interface BootstrapOverrides {
	pluginData?: Record<string, unknown>;
	keepDirs?: string[];
}

export async function bootstrapObsidian(
	options: { prefix?: string; overrides?: BootstrapOverrides } = {}
): Promise<BootstrappedObsidian> {
	const extraPluginData = options.overrides?.pluginData ?? {};
	const keepDirs = options.overrides?.keepDirs ?? ["Notes"];

	return sharedBootstrap({
		version: harness.readVersion(),
		polishVisibleWindow: HEADED_VISIBLE,
		vaultSeedDir: harness.vaultSeedDir,
		vaultsRoot: harness.vaultsRoot,
		prefix: options.prefix ?? "run",
		plugin: { id: PLUGIN_ID, rootDir: PLUGIN_ROOT },
		logger: harness.log,
		// Trim retained vaults to just user-visible content + plugin data, which
		// is regenerable from seed. Saves disk during long serial runs.
		leanVaultOnClose: { keep: keepDirs },
		env: {
			NEXUS_LOG_LEVEL: harness.verbose ? "debug" : "warn",
		},
		seedPluginData: (pluginDir, { manifest }) => {
			// `writeStandardAppJson` writes `.obsidian/app.json` with
			// `alwaysUpdateLinks: true` so the "Update links" modal never appears
			// when the plugin renames a file. That modal would block subsequent
			// test clicks.
			writeStandardAppJson(pluginDir);

			writeFileSync(
				join(pluginDir, "data.json"),
				JSON.stringify(
					{
						version: manifest["version"] as string,
						...DEFAULT_PLUGIN_DATA,
						...extraPluginData,
					},
					null,
					2
				),
				"utf8"
			);
		},
		afterPluginLoaded: async (page: Page) => {
			// Force the plugin to finish its async initialization. The indexer
			// starts in `initializePlugin()` after `onload()` returns, so commands
			// are registered immediately but cross-file relationship sync isn't
			// active until the indexer has scanned the vault.
			await page.waitForFunction(
				(id) => {
					const w = window as unknown as NexusWindow;
					const plugin = w.app.plugins.plugins[id] as { indexer?: unknown } | undefined;
					return Boolean(plugin?.indexer);
				},
				PLUGIN_ID,
				{ timeout: 60_000 }
			);
			harness.log.debug("afterPluginLoaded: indexer is ready");
		},
	});
}

type UseObsidian = (handle: BootstrappedObsidian) => Promise<void>;

async function runWithObsidianHandle(
	options: { prefix: string; overrides?: BootstrapOverrides; expectedErrorPatterns?: readonly RegExp[] },
	use: UseObsidian
): Promise<void> {
	const handle = await bootstrapObsidian(options);
	const guard = createConsoleErrorGuard({
		expectedErrorPatterns: options.expectedErrorPatterns ?? [],
	});
	guard.attach(handle.page);

	try {
		await use(handle);
	} finally {
		guard.detach(handle.page);
		await handle.close();
	}

	guard.throwIfErrors();
}

export const test = base.extend<{ obsidian: BootstrappedObsidian }>({
	// eslint-disable-next-line no-empty-pattern
	obsidian: async ({}, use) => {
		await runWithObsidianHandle({ prefix: "spec" }, use);
	},
});

export { expect } from "@playwright/test";
