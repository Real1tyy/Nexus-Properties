import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		globals: true,
		testTimeout: 10000,
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		passWithNoTests: true,
		server: {
			deps: {
				inline: ["@real1ty-obsidian-plugins"],
			},
		},
	},
	resolve: {
		alias: [
			{ find: "obsidian", replacement: path.resolve(__dirname, "tests/mocks/obsidian.ts") },
			{
				find: "@real1ty-obsidian-plugins/testing",
				replacement: path.resolve(__dirname, "./shared/src/testing/index.ts"),
			},
		],
		extensions: [".ts", ".tsx", ".js", ".mjs", ".json"],
	},
	// Ensure external dependencies can find obsidian
	define: {
		global: "globalThis",
	},
});
