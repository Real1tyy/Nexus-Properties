import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		passWithNoTests: true,
		// Scope to this plugin's own tests. shared/ and shared-react/ have their
		// own vitest configs (with a node/jsdom projects split) and are invoked
		// via `pnpm -F <pkg> test` — the plugin run must not glob them here,
		// otherwise their DOM-environment tests would fall through to node.
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
		exclude: ["**/node_modules/**", "**/dist/**", "shared/**", "shared-react/**"],
		server: {
			deps: {
				inline: ["@real1ty-obsidian-plugins"],
			},
		},
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "tests/mocks/obsidian.ts"),
		},
		extensions: [".ts", ".tsx", ".js", ".mjs", ".json"],
	},
	// Ensure external dependencies can find obsidian
	define: {
		global: "globalThis",
	},
});
