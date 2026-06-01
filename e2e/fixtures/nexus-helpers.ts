import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { BootstrappedObsidian } from "@real1ty-obsidian-plugins/testing/e2e";

import { PLUGIN_ID } from "./constants";
import type { NexusWindow } from "./window-types";

/**
 * Seed a markdown note into the vault directly on disk (bypasses Obsidian).
 * Returns the absolute path so subsequent reads can verify.
 */
export function seedNote(
	obsidian: BootstrappedObsidian,
	relativePath: string,
	frontmatter: Record<string, unknown> = {},
	body = ""
): string {
	const absolute = join(obsidian.vaultDir, relativePath);
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, `${buildFrontmatterBlock(frontmatter)}${body}`, "utf8");
	return absolute;
}

/**
 * Read on-disk frontmatter for a vault-relative path. Returns an empty object
 * for files that exist but have no frontmatter. Throws if the file is missing
 * (assertions on frontmatter for a non-existent file are a test bug).
 */
export function readNoteFrontmatter(obsidian: BootstrappedObsidian, relativePath: string): Record<string, unknown> {
	const absolute = join(obsidian.vaultDir, relativePath);
	if (!existsSync(absolute)) {
		throw new Error(`readNoteFrontmatter: file not found: ${relativePath}`);
	}
	const content = readFileSync(absolute, "utf8");
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	return parseFrontmatterYaml(match[1]);
}

/** Strip surrounding YAML quotes (single or double) from a scalar. */
function stripYamlQuotes(value: string): string {
	const trimmed = value.trim();
	if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

/** Tiny YAML subset parser — handles `key: value`, `key:\n  - item` lists, and `key: []`. */
function parseFrontmatterYaml(yaml: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const lines = yaml.split("\n");
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		const match = line.match(/^(\S[^:]*):\s*(.*)$/);
		if (!match) {
			i++;
			continue;
		}
		const key = match[1];
		const inlineValue = match[2];

		// Inline empty array form: `Child: []`
		if (inlineValue === "[]") {
			result[key] = [];
			i++;
			continue;
		}

		if (inlineValue === "" || inlineValue === undefined) {
			// Collect subsequent indented `- item` lines into an array
			const items: string[] = [];
			let j = i + 1;
			while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
				items.push(stripYamlQuotes(lines[j].replace(/^\s+-\s+/, "")));
				j++;
			}
			if (items.length > 0) {
				result[key] = items;
				i = j;
				continue;
			}
			result[key] = "";
		} else {
			try {
				result[key] = JSON.parse(inlineValue);
			} catch {
				result[key] = stripYamlQuotes(inlineValue);
			}
		}
		i++;
	}
	return result;
}

/**
 * Wait until the plugin has finished indexing the seeded vault. Polls
 * `getRelationshipsSnapshot()` for any entry — that's the cheapest "the plugin
 * has finished its initial scan" signal.
 */
export async function waitForIndexerReady(obsidian: BootstrappedObsidian, minEntries = 1): Promise<void> {
	await obsidian.page.waitForFunction(
		({ id, min }) => {
			const w = window as unknown as NexusWindow;
			const plugin = w.app.plugins.plugins[id] as
				| {
						indexer?: { getRelationshipsSnapshot: () => ReadonlyMap<string, unknown> };
				  }
				| undefined;
			return Boolean(plugin?.indexer && plugin.indexer.getRelationshipsSnapshot().size >= min);
		},
		{ id: PLUGIN_ID, min: minEntries },
		{ timeout: 30_000 }
	);
	// Settle: the indexer's 300ms debounce + RxJS pipelines + manager async
	// chain can still be processing background batches when the snapshot first
	// reaches minEntries. Wait one full debounce window plus a margin to absorb
	// in-flight events before the test issues its own edits.
	await new Promise((r) => setTimeout(r, 500));
}

/**
 * Sentinel field injected when a test passes empty frontmatter. The generic
 * Indexer drops files where `cache.frontmatter` is undefined (see buildEvent
 * in shared/src/core/indexer.ts), and Obsidian leaves frontmatter undefined
 * for files with `---\\n---\\n` empty blocks. A single placeholder forces the
 * file to enter the indexer's cache so subsequent edits register as diffs.
 *
 * Tests that assert on frontmatter shape can simply ignore this key — it
 * starts with `_` so the `hideUnderscoreProperties` setting hides it from
 * any UI rendering.
 */
export const SEED_PLACEHOLDER_KEY = "_nexus_test_seed";

/**
 * Build the canonical wiki link Nexus writes when inverting a relationship.
 * The plugin's `addLinkToProperty` → `formatWikiLink` (in shared) yields
 * `[[<folder>/<basename>|<basename>]]` for any file inside a folder, so test
 * assertions targeting on-disk inverse links must use this exact shape.
 *
 * Example: `linkTo("Notes", "Kid")` → `"[[Notes/Kid|Kid]]"`.
 * For top-level files (no folder) pass an empty string for `folder`.
 */
export function linkTo(folder: string, basename: string): string {
	return folder.length === 0 ? `[[${basename}]]` : `[[${folder}/${basename}|${basename}]]`;
}

/**
 * True if `value` is a string array containing a wiki link that points at
 * the given basename (whether bare `[[Kid]]` or full-path `[[Notes/Kid|Kid]]`).
 * Use when you don't care which folder the link refers to.
 */
export function containsLinkTo(value: unknown, basename: string): boolean {
	if (!Array.isArray(value)) return false;
	return value.some((v) => {
		if (typeof v !== "string") return false;
		return v === `[[${basename}]]` || v.endsWith(`|${basename}]]`) || v.endsWith(`/${basename}]]`);
	});
}

/**
 * Build a frontmatter YAML block. ALWAYS emits a `---` envelope; injects
 * `_nexus_test_seed: true` when no other keys are provided so the indexer
 * picks the file up immediately. Shared by `seedNote` and `createNote`.
 */
function buildFrontmatterBlock(frontmatter: Record<string, unknown>): string {
	const effective = Object.keys(frontmatter).length === 0 ? { [SEED_PLACEHOLDER_KEY]: true } : frontmatter;
	const lines = Object.entries(effective).map(([key, value]) => {
		if (Array.isArray(value)) {
			return value.length === 0 ? `${key}: []` : `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
		}
		return `${key}: ${JSON.stringify(value)}`;
	});
	return `---\n${lines.join("\n")}\n---\n`;
}

/**
 * Create a markdown note through Obsidian's `vault.create()` API. Unlike
 * `seedNote` (writeFileSync), this path goes through Obsidian's vault layer:
 * the metadataCache picks the file up immediately, and the indexer's
 * file-changed subscription fires. Required for any spec that depends on
 * bidirectional sync after bootstrap.
 *
 * Creates parent folders as needed.
 */
export async function createNote(
	obsidian: BootstrappedObsidian,
	relativePath: string,
	frontmatter: Record<string, unknown> = {},
	body = ""
): Promise<void> {
	const content = `${buildFrontmatterBlock(frontmatter)}${body}`;
	await obsidian.page.evaluate(
		async ({ path, content: c }) => {
			const w = window as unknown as NexusWindow;
			const segments = path.split("/").slice(0, -1);
			if (segments.length > 0) {
				const dir = segments.join("/");
				if (!w.app.vault.getAbstractFileByPath(dir)) {
					await w.app.vault.createFolder(dir);
				}
			}
			await w.app.vault.create(path, c);
		},
		{ path: relativePath, content }
	);
}

/**
 * Create several notes in parallel via `vault.create`. Order is preserved
 * for the awaits so cross-referencing notes can be seeded predictably.
 */
export async function createNotes(
	obsidian: BootstrappedObsidian,
	notes: Array<{ path: string; frontmatter?: Record<string, unknown>; body?: string }>
): Promise<void> {
	for (const n of notes) {
		await createNote(obsidian, n.path, n.frontmatter ?? {}, n.body ?? "");
	}
}

/**
 * Read the indexer's in-memory relationships snapshot — the set of files it
 * believes are indexed. Use this to verify the directory filter is honoured
 * (no entry for files outside `directories`) or that initial-scan completed.
 */
export async function getIndexerSnapshotKeys(obsidian: BootstrappedObsidian): Promise<string[]> {
	return obsidian.page.evaluate((id) => {
		const w = window as unknown as NexusWindow;
		const plugin = w.app.plugins.plugins[id] as
			| { indexer?: { getRelationshipsSnapshot: () => ReadonlyMap<string, unknown> } }
			| undefined;
		const snapshot = plugin?.indexer?.getRelationshipsSnapshot();
		return snapshot ? [...snapshot.keys()].sort() : [];
	}, PLUGIN_ID);
}

/**
 * Trigger a full vault rescan. Useful after seeding files post-bootstrap so the
 * indexer picks them up immediately without waiting for the metadata cache.
 */
export async function triggerRescan(obsidian: BootstrappedObsidian): Promise<void> {
	await obsidian.page.evaluate((id) => {
		const w = window as unknown as NexusWindow;
		const plugin = w.app.plugins.plugins[id] as { triggerFullRescan?: () => Promise<void> } | undefined;
		return plugin?.triggerFullRescan?.();
	}, PLUGIN_ID);
}

/**
 * Modify frontmatter via Obsidian's fileManager so the metadataCache picks the
 * change up. Equivalent to a user editing the YAML in the editor.
 */
export async function setFrontmatter(
	obsidian: BootstrappedObsidian,
	relativePath: string,
	patch: Record<string, unknown>
): Promise<void> {
	await obsidian.page.evaluate(
		async ({ path, patch: p }) => {
			const w = window as unknown as NexusWindow;
			const file = w.app.vault.getAbstractFileByPath(path);
			if (!file) throw new Error(`setFrontmatter: file not found: ${path}`);
			await w.app.fileManager.processFrontMatter(file, (fm) => {
				for (const [key, value] of Object.entries(p)) {
					(fm as Record<string, unknown>)[key] = value;
				}
			});
		},
		{ path: relativePath, patch }
	);
}

/**
 * Wait until a specific frontmatter key on a vault note equals the expected
 * value. Reads the file directly each iteration (cheaper than driving the
 * Obsidian metadata cache through `waitForFunction`).
 */
export async function expectFrontmatterEventually(
	obsidian: BootstrappedObsidian,
	relativePath: string,
	key: string,
	predicate: (value: unknown) => boolean,
	timeoutMs = 10_000
): Promise<unknown> {
	const start = Date.now();
	let last: unknown;
	while (Date.now() - start < timeoutMs) {
		try {
			const fm = readNoteFrontmatter(obsidian, relativePath);
			last = fm[key];
			if (predicate(last)) return last;
		} catch {
			// file might not exist yet; keep polling
		}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(
		`expectFrontmatterEventually: timed out waiting for ${relativePath} to satisfy predicate on key "${key}". last value: ${JSON.stringify(last)}`
	);
}
