import { describe, expect, it } from "vitest";

import { Indexer } from "../../src/core/indexer";
import { createMockFile, createMockSettings, createMockSettingsSubject, createSeededApp } from "../fixtures";

describe("Indexer", () => {
	describe("shouldIndexFile", () => {
		it("indexes every file when directories include '*'", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject({ directories: ["*"] }));

			expect(indexer.shouldIndexFile("Anywhere/Note.md")).toBe(true);
			expect(indexer.shouldIndexFile("Solo.md")).toBe(true);
		});

		it("indexes only files inside configured directories", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject({ directories: ["Notes", "Knowledge"] }));

			expect(indexer.shouldIndexFile("Notes/A.md")).toBe(true);
			expect(indexer.shouldIndexFile("Knowledge/B.md")).toBe(true);
			expect(indexer.shouldIndexFile("Outside/C.md")).toBe(false);
		});

		it("treats trailing slash in directory as no-op", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject({ directories: ["Notes/"] }));

			expect(indexer.shouldIndexFile("Notes/A.md")).toBe(true);
		});

		it("matches the directory file itself, not just children", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject({ directories: ["Notes"] }));

			expect(indexer.shouldIndexFile("Notes")).toBe(true);
		});

		it("re-evaluates after settings change", () => {
			const { app } = createSeededApp([]);
			const settings$ = createMockSettingsSubject({ directories: ["Notes"] });
			const indexer = new Indexer(app, settings$);

			expect(indexer.shouldIndexFile("Other/A.md")).toBe(false);

			settings$.next(createMockSettings({ directories: ["Other"] }));

			expect(indexer.shouldIndexFile("Other/A.md")).toBe(true);
			expect(indexer.shouldIndexFile("Notes/A.md")).toBe(false);
		});
	});

	describe("extractRelationships", () => {
		it("returns the configured parent / children / related arrays", () => {
			const { app } = createSeededApp([]);
			const settings$ = createMockSettingsSubject({
				parentProp: "Parent",
				childrenProp: "Child",
				relatedProp: "Related",
			});
			const indexer = new Indexer(app, settings$);
			const file = createMockFile("Note.md", { mtime: 42 });

			const rels = indexer.extractRelationships(file as any, {
				Parent: ["[[Parent]]"],
				Child: ["[[Child]]"],
				Related: ["[[Alice]]"],
			});

			expect(rels.filePath).toBe("Note.md");
			expect(rels.mtime).toBe(42);
			expect(rels.parent).toEqual(["[[Parent]]"]);
			expect(rels.children).toEqual(["[[Child]]"]);
			expect(rels.related).toEqual(["[[Alice]]"]);
		});

		it("returns empty arrays when frontmatter keys are missing", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject());
			const file = createMockFile("Note.md");

			const rels = indexer.extractRelationships(file as any, {});

			expect(rels.parent).toEqual([]);
			expect(rels.children).toEqual([]);
			expect(rels.related).toEqual([]);
		});

		it("honors custom property names", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(
				app,
				createMockSettingsSubject({ parentProp: "Up", childrenProp: "Down", relatedProp: "Sibling" })
			);
			const file = createMockFile("Note.md");

			const rels = indexer.extractRelationships(file as any, {
				Up: ["[[Parent]]"],
				Down: ["[[Child]]"],
				Sibling: ["[[Pal]]"],
				// Real-Nexus props should be ignored under custom names:
				Parent: ["[[Should Not Appear]]"],
			});

			expect(rels.parent).toEqual(["[[Parent]]"]);
			expect(rels.children).toEqual(["[[Child]]"]);
			expect(rels.related).toEqual(["[[Pal]]"]);
		});

		it("preserves the original frontmatter object", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject());
			const file = createMockFile("Note.md");
			const fm = { Status: "open", Priority: "high" };

			const rels = indexer.extractRelationships(file as any, fm);

			expect(rels.frontmatter).toBe(fm);
		});
	});

	describe("lifecycle", () => {
		it("getRelationshipsSnapshot starts empty before any events arrive", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject());

			expect(indexer.getRelationshipsSnapshot().size).toBe(0);
		});

		it("stop() clears the relationships cache", () => {
			const { app } = createSeededApp([]);
			const indexer = new Indexer(app, createMockSettingsSubject());

			indexer.stop();

			expect(indexer.getRelationshipsSnapshot().size).toBe(0);
		});
	});
});
