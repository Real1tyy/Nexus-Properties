import { Subject } from "rxjs";
import { describe, expect, it } from "vitest";

import { Indexer, type IndexerEvent } from "../../src/core/indexer";
import { PropertiesManager } from "../../src/core/properties-manager";
import { createMockSettingsSubject, createSeededApp, makeRelationships, readFrontmatter, wikiLinks } from "../fixtures";

/**
 * Integration tests for the Indexer → PropertiesManager pipeline.
 *
 * These wire a real Indexer (constructed against the seeded mock app) with a
 * real PropertiesManager. The manager subscribes to a manual `Subject` instead
 * of `indexer.events$` so the test controls the event timing precisely without
 * needing to drive the generic indexer's file-scanning machinery.
 */

async function flushAsync(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function wire(seed: Parameters<typeof createSeededApp>[0]) {
	const { app, files } = createSeededApp(seed);
	const settings$ = createMockSettingsSubject({ autoLinkSiblings: false });
	const indexer = new Indexer(app, settings$);
	const events$ = new Subject<IndexerEvent>();
	const manager = new PropertiesManager(app, settings$);
	manager.start(events$);
	return { app, files, indexer, manager, events$ };
}

describe("Indexer → PropertiesManager pipeline", () => {
	it("emitting a file-changed event with a new parent updates the parent's Child property", async () => {
		const { files, events$ } = wire([
			{ path: "Parent.md", frontmatter: {} },
			{ path: "Note.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);

		events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md" }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent") }),
		});

		await flushAsync();

		expect(readFrontmatter(files, "Parent.md")["Child"]).toEqual(["[[Note]]"]);
	});

	it("swapping the parent rewires both old and new parent frontmatter", async () => {
		const { files, events$ } = wire([
			{ path: "Parent.md", frontmatter: { Child: ["[[Note]]"] } },
			{ path: "Parent2.md", frontmatter: {} },
			{ path: "Note.md", frontmatter: { Parent: wikiLinks("Parent2") } },
		]);

		events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent") }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent2") }),
		});

		await flushAsync();

		expect(readFrontmatter(files, "Parent.md")["Child"]).toEqual([]);
		expect(readFrontmatter(files, "Parent2.md")["Child"]).toEqual(["[[Note]]"]);
	});

	it("symmetric related sync — adding a Related link writes back on the target", async () => {
		const { files, events$ } = wire([
			{ path: "Alice.md", frontmatter: {} },
			{ path: "Note.md", frontmatter: { Related: wikiLinks("Alice") } },
		]);

		events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md" }),
			newRelationships: makeRelationships({ filePath: "Note.md", related: wikiLinks("Alice") }),
		});

		await flushAsync();

		expect(readFrontmatter(files, "Alice.md")["Related"]).toEqual(["[[Note]]"]);
	});

	it("deletion propagates: a removed file is stripped from each related node's frontmatter", async () => {
		const { files, events$ } = wire([
			{ path: "Parent.md", frontmatter: { Child: ["[[Note]]"] } },
			{ path: "Alice.md", frontmatter: { Related: ["[[Note]]"] } },
		]);

		events$.next({
			type: "file-deleted",
			filePath: "Note.md",
			oldRelationships: makeRelationships({
				filePath: "Note.md",
				parent: wikiLinks("Parent"),
				related: wikiLinks("Alice"),
			}),
		});

		await flushAsync();

		expect(readFrontmatter(files, "Parent.md")["Child"]).toEqual([]);
		expect(readFrontmatter(files, "Alice.md")["Related"]).toEqual([]);
	});

	it("a full rescan backfills inverse links for pre-existing on-disk relationships", async () => {
		const { files, indexer, manager } = wire([
			{ path: "Parent.md", frontmatter: {} },
			{ path: "Child.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);

		await manager.rescanAndAssignPropertiesForAllFiles(indexer);
		await flushAsync();

		expect(readFrontmatter(files, "Parent.md")["Child"]).toEqual(["[[Child]]"]);
	});

	it("stop() — events emitted after stop are ignored", async () => {
		const { files, manager, events$ } = wire([
			{ path: "Parent.md", frontmatter: {} },
			{ path: "Note.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);

		manager.stop();

		events$.next({
			type: "file-changed",
			filePath: "Note.md",
			oldRelationships: makeRelationships({ filePath: "Note.md" }),
			newRelationships: makeRelationships({ filePath: "Note.md", parent: wikiLinks("Parent") }),
		});

		await flushAsync();

		expect(readFrontmatter(files, "Parent.md")["Child"]).toBeUndefined();
	});
});
