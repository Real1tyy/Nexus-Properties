import { Subject } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import type { IndexerEvent } from "../../src/core/indexer";
import { PropertiesManager } from "../../src/core/properties-manager";
import {
	createMockSettingsSubject,
	createSeededApp,
	makeRelationships,
	readFrontmatter,
	wikiLinks,
	type SeedFile,
} from "../fixtures";

/**
 * Drain the microtask queue + the next macrotask. The PropertiesManager handler
 * chains async operations across the parent/children/related configs and
 * issues file IO via the fileManager mock — both deferred work that a couple
 * of `await Promise.resolve()` calls don't reliably exhaust.
 */
async function flushAsync(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

interface Harness {
	app: ReturnType<typeof createSeededApp>["app"];
	files: Map<string, SeedFile>;
	settings$: ReturnType<typeof createMockSettingsSubject>;
	events$: Subject<IndexerEvent>;
	manager: PropertiesManager;
}

function harness(seed: SeedFile[], settingsOverrides: Parameters<typeof createMockSettingsSubject>[0] = {}): Harness {
	const { app, files } = createSeededApp(seed);
	const settings$ = createMockSettingsSubject(settingsOverrides);
	const events$ = new Subject<IndexerEvent>();
	const manager = new PropertiesManager(app, settings$);
	manager.start(events$);
	return { app, files, settings$, events$, manager };
}

describe("PropertiesManager — file modification (bidirectional sync)", () => {
	it("adds the source file to the parent's children when a Parent link is added", async () => {
		const h = harness(
			[
				{ path: "Parent.md", frontmatter: {} },
				{ path: "Note.md", frontmatter: { Parent: wikiLinks("Parent") } },
			],
			{ autoLinkSiblings: false }
		);

		h.events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md" }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent") }),
		});

		// Allow the async handler to settle
		await flushAsync();

		expect(readFrontmatter(h.files, "Parent.md")["Child"]).toEqual(["[[Note]]"]);
	});

	it("removes the source file from the parent's children when the Parent link is removed", async () => {
		const h = harness(
			[
				{ path: "Parent.md", frontmatter: { Child: ["[[Note]]"] } },
				{ path: "Note.md", frontmatter: {} },
			],
			{ autoLinkSiblings: false }
		);

		h.events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent") }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: [] }),
		});

		await flushAsync();

		expect(readFrontmatter(h.files, "Parent.md")["Child"]).toEqual([]);
	});

	it("writes the inverse on first sight of a file with no prior cached relationships", async () => {
		const h = harness(
			[
				{ path: "Parent.md", frontmatter: {} },
				{ path: "Child.md", frontmatter: { Parent: wikiLinks("Parent") } },
			],
			{ autoLinkSiblings: false }
		);

		h.events$.next({
			type: "file-changed",
			filePath: "Child.md",
			newRelationships: makeRelationships({ filePath: "Child.md", parent: wikiLinks("Parent") }),
		});

		await flushAsync();

		expect(readFrontmatter(h.files, "Parent.md")["Child"]).toEqual(["[[Child]]"]);
	});

	it("does nothing for parents that don't resolve to a file", async () => {
		const h = harness([{ path: "Note.md", frontmatter: { Parent: wikiLinks("Ghost") } }], { autoLinkSiblings: false });

		h.events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md" }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Ghost") }),
		});

		await Promise.resolve();

		// No new file appears for "Ghost"
		expect(h.files.has("Ghost.md")).toBe(false);
	});
});

describe("PropertiesManager — file deletion", () => {
	it("removes references to a deleted file from each related node", async () => {
		const h = harness(
			[
				{ path: "Parent.md", frontmatter: { Child: ["[[Note]]"] } },
				{ path: "Sibling.md", frontmatter: { Related: ["[[Note]]"] } },
			],
			{ autoLinkSiblings: false }
		);

		h.events$.next({
			type: "file-deleted",
			filePath: "Note.md",
			oldRelationships: makeRelationships({
				filePath: "Note.md",
				parent: wikiLinks("Parent"),
				related: wikiLinks("Sibling"),
			}),
		});

		await flushAsync();

		expect(readFrontmatter(h.files, "Parent.md")["Child"]).toEqual([]);
		expect(readFrontmatter(h.files, "Sibling.md")["Related"]).toEqual([]);
	});
});

describe("PropertiesManager — rename propagation", () => {
	it("renames children whose filenames start with the old parent prefix", async () => {
		const h = harness(
			[
				{ path: "Project.md", frontmatter: {} },
				{ path: "Project - Task 1.md", frontmatter: { Parent: ["[[Initiative]]"] } },
			],
			{ propagateRenameToChildren: true, autoLinkSiblings: false }
		);

		h.events$.next({
			type: "file-renamed",
			filePath: "Initiative.md",
			oldPath: "Project.md",
			newRelationships: makeRelationships({
				filePath: "Initiative.md",
				children: ["[[Project - Task 1]]"],
			}),
		});

		await flushAsync();

		expect(h.files.has("Initiative - Task 1.md")).toBe(true);
		expect(h.files.has("Project - Task 1.md")).toBe(false);
	});

	it("is a no-op when propagateRenameToChildren is disabled", async () => {
		const h = harness(
			[
				{ path: "Project.md", frontmatter: {} },
				{ path: "Project - Task 1.md", frontmatter: {} },
			],
			{ propagateRenameToChildren: false }
		);

		h.events$.next({
			type: "file-renamed",
			filePath: "Initiative.md",
			oldPath: "Project.md",
			newRelationships: makeRelationships({ filePath: "Initiative.md", children: ["[[Project - Task 1]]"] }),
		});

		await Promise.resolve();

		expect(h.files.has("Project - Task 1.md")).toBe(true);
		expect(h.files.has("Initiative - Task 1.md")).toBe(false);
	});

	it("does nothing when display name is unchanged", async () => {
		const h = harness(
			[
				{ path: "Project.md", frontmatter: {} },
				{ path: "Project - Task 1.md", frontmatter: {} },
			],
			{ propagateRenameToChildren: true }
		);
		const renameSpy = vi.spyOn(h.app.vault, "rename");

		h.events$.next({
			type: "file-renamed",
			filePath: "Project.md",
			oldPath: "Project.md",
			newRelationships: makeRelationships({ filePath: "Project.md", children: ["[[Project - Task 1]]"] }),
		});

		await Promise.resolve();

		expect(renameSpy).not.toHaveBeenCalled();
	});
});

describe("PropertiesManager — sibling auto-linking", () => {
	it("links new siblings to one another via the related prop", async () => {
		// Parent already has two children — adding Note as a third makes the existing
		// siblings related to Note and vice versa.
		const h = harness(
			[
				{ path: "Parent.md", frontmatter: { Child: ["[[A]]", "[[B]]"] } },
				{ path: "A.md", frontmatter: { Parent: wikiLinks("Parent") } },
				{ path: "B.md", frontmatter: { Parent: wikiLinks("Parent") } },
				{ path: "Note.md", frontmatter: { Parent: wikiLinks("Parent") } },
			],
			{ autoLinkSiblings: true }
		);

		h.events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md" }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent") }),
		});

		// Let three layers of async settle.
		await flushAsync();

		const me = readFrontmatter(h.files, "Note.md");
		expect(me["Related"]).toEqual(expect.arrayContaining(["[[A]]", "[[B]]"]));
	});
});

describe("PropertiesManager — lifecycle", () => {
	it("stop() unsubscribes — no more events are processed", async () => {
		const h = harness(
			[
				{ path: "Parent.md", frontmatter: {} },
				{ path: "Note.md", frontmatter: {} },
			],
			{
				autoLinkSiblings: false,
			}
		);

		h.manager.stop();

		h.events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md" }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent") }),
		});

		await flushAsync();

		expect(readFrontmatter(h.files, "Parent.md")["Child"]).toBeUndefined();
	});
});
