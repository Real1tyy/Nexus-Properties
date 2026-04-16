import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import { sharedVitestAliases } from "./shared/src/testing/vitest-aliases.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		globals: true,
		testTimeout: 10000,
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		passWithNoTests: true,
	},
	resolve: {
		alias: [
			{ find: "obsidian", replacement: path.resolve(__dirname, "tests/mocks/obsidian.ts") },
			...sharedVitestAliases(__dirname),
		],
		extensions: [".ts", ".tsx", ".js", ".mjs", ".json"],
	},
	// Ensure external dependencies can find obsidian
	define: {
		global: "globalThis",
	},
});
