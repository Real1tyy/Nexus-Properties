import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { sharedVitestAliases, VITEST_POOL_OPTIONS } from "./shared/src/testing/vitest-aliases.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test files that need a DOM environment. Single source of truth used by both
// the dom project's `include` and the node project's `exclude` so a test never
// runs in both environments. Integration tests under `tests/integrations/**`
// wire real modules without React/DOM rendering, so they stay in node.
const DOM_PATTERNS = ["tests/components/**/*.test.ts", "tests/components/**/*.test.tsx"];

const SHARED_EXCLUDE = ["**/node_modules/**", "**/dist/**", "e2e/**"];

export default defineConfig({
	test: {
		globals: true,
		testTimeout: 10000,
		setupFiles: ["./tests/setup.ts"],
		exclude: SHARED_EXCLUDE,
		passWithNoTests: true,
		...VITEST_POOL_OPTIONS,
		pool: "threads",
		projects: [
			{
				extends: true,
				test: {
					name: "node",
					environment: "node",
					include: ["tests/**/*.test.ts"],
					exclude: [...SHARED_EXCLUDE, ...DOM_PATTERNS],
					isolate: false,
				},
			},
			{
				extends: true,
				test: {
					name: "dom",
					environment: "happy-dom",
					include: DOM_PATTERNS,
					exclude: SHARED_EXCLUDE,
					isolate: false,
				},
			},
		],
	},
	resolve: {
		alias: [
			{ find: "obsidian", replacement: path.resolve(__dirname, "tests/mocks/obsidian.ts") },
			...sharedVitestAliases(__dirname),
		],
		extensions: [".ts", ".tsx", ".js", ".mjs", ".json"],
	},
	define: {
		global: "globalThis",
	},
});
