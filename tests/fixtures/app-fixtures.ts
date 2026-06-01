import type { App, TFile } from "obsidian";
import { vi } from "vitest";

import { createMockFile, TFile as MockTFile } from "../mocks/obsidian";

export interface SeedFile {
	path: string;
	frontmatter?: Record<string, unknown>;
	content?: string;
	mtime?: number;
}

/**
 * App factory that wires vault + metadata cache + fileManager around a seeded
 * file map. Resolves wiki links via basename and full path (case-insensitive),
 * matching Obsidian's default link resolution closely enough for relationship
 * and hierarchy tests.
 *
 * `processFrontMatter` mutates the file's frontmatter entry in-place so callers
 * can read it back after the call resolves — the same contract Obsidian provides.
 */
export function createSeededApp(seed: SeedFile[] = []): { app: App; files: Map<string, SeedFile> } {
	const files = new Map<string, SeedFile>(seed.map((f) => [f.path, f]));

	const buildTFile = (path: string): TFile => {
		const seedEntry = files.get(path);
		const file =
			seedEntry?.mtime !== undefined ? createMockFile(path, { mtime: seedEntry.mtime }) : createMockFile(path);
		return file as unknown as TFile;
	};

	const findFile = (lookupPath: string): TFile | null => {
		// Exact match
		if (files.has(lookupPath)) return buildTFile(lookupPath);

		// Try with .md appended
		const withExt = lookupPath.endsWith(".md") ? lookupPath : `${lookupPath}.md`;
		if (files.has(withExt)) return buildTFile(withExt);

		// Case-insensitive scan
		const lowered = lookupPath.toLowerCase();
		const loweredWithExt = withExt.toLowerCase();
		for (const path of files.keys()) {
			const pathLower = path.toLowerCase();
			if (pathLower === lowered || pathLower === loweredWithExt) return buildTFile(path);
		}

		// Basename match: [[Child]] → Folder/Child.md (with or without .md suffix)
		const lookupBasename = lookupPath.replace(/\.md$/, "").split("/").pop() ?? lookupPath;
		for (const path of files.keys()) {
			const basename = path.split("/").pop()?.replace(/\.md$/, "");
			if (basename === lookupBasename) return buildTFile(path);
		}

		return null;
	};

	const app = {
		vault: {
			getAbstractFileByPath: vi.fn((path: string) => findFile(path)),
			getFileByPath: vi.fn((path: string) => findFile(path)),
			getMarkdownFiles: vi.fn(() => [...files.keys()].map(buildTFile)),
			getFiles: vi.fn(() => [...files.keys()].map(buildTFile)),
			read: vi.fn(async (file: TFile) => files.get(file.path)?.content ?? ""),
			cachedRead: vi.fn(async (file: TFile) => files.get(file.path)?.content ?? ""),
			modify: vi.fn(async (file: TFile, content: string) => {
				const entry = files.get(file.path);
				if (entry) entry.content = content;
			}),
			create: vi.fn(async (path: string, content: string) => {
				const newFile: SeedFile = { path, content, frontmatter: {} };
				files.set(path, newFile);
				return buildTFile(path);
			}),
			delete: vi.fn(async (file: TFile) => {
				files.delete(file.path);
			}),
			rename: vi.fn(async (file: TFile, newPath: string) => {
				const entry = files.get(file.path);
				if (!entry) return;
				files.delete(file.path);
				files.set(newPath, { ...entry, path: newPath });
			}),
			on: vi.fn().mockReturnValue({ id: "vault-event" }),
			off: vi.fn(),
			getFolderByPath: vi.fn(),
		},
		metadataCache: {
			getFileCache: vi.fn((file: TFile) => {
				const entry = files.get(file.path);
				return entry?.frontmatter ? { frontmatter: entry.frontmatter } : null;
			}),
			getFirstLinkpathDest: vi.fn((linkPath: string, _sourcePath: string) => findFile(linkPath)),
			on: vi.fn().mockReturnValue({ id: "metadata-event" }),
			off: vi.fn(),
			offref: vi.fn(),
		},
		fileManager: {
			processFrontMatter: vi.fn(async (file: TFile, callback: (fm: Record<string, unknown>) => void) => {
				const entry = files.get(file.path);
				if (!entry) return;
				entry.frontmatter = entry.frontmatter ?? {};
				callback(entry.frontmatter);
			}),
			renameFile: vi.fn(async (file: TFile, newPath: string) => {
				const entry = files.get(file.path);
				if (!entry) return;
				files.delete(file.path);
				files.set(newPath, { ...entry, path: newPath });
			}),
		},
		workspace: {
			getActiveFile: vi.fn(),
			getLeavesOfType: vi.fn().mockReturnValue([]),
			on: vi.fn().mockReturnValue({ id: "workspace-event" }),
			onLayoutReady: vi.fn((cb: () => void) => cb()),
			openLinkText: vi.fn(),
		},
	} as unknown as App;

	return { app, files };
}

/** Quick way to mint a TFile that the seeded app will resolve. */
export function tfileFor(path: string): TFile {
	return createMockFile(path) as unknown as TFile;
}

/**
 * Read frontmatter for a file from a seeded vault. Returns an empty object
 * (never throws) so assertions in tests stay readable.
 */
export function readFrontmatter(files: Map<string, SeedFile>, path: string): Record<string, unknown> {
	return files.get(path)?.frontmatter ?? {};
}

// Re-export so test files only need one import for file-creation helpers
export { createMockFile, MockTFile };
