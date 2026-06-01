import { afterEach, describe, expect, it } from "vitest";

import { HierarchyProvider } from "../../../src/core/hierarchy/hierarchy-provider";
import { Indexer } from "../../../src/core/indexer";
import {
	createMockSettingsStore,
	createMockSettingsSubject,
	createSeededApp,
	tfileFor,
	wikiLinks,
} from "../../fixtures";

afterEach(() => {
	HierarchyProvider.resetInstance();
});

describe("HierarchyProvider.getInstance", () => {
	it("returns the same instance across calls", () => {
		const { app } = createSeededApp([]);
		const store = createMockSettingsStore();
		const indexer = new Indexer(app, createMockSettingsSubject());

		const a = HierarchyProvider.getInstance(app, indexer, store as any);
		const b = HierarchyProvider.getInstance(app, indexer, store as any);

		expect(a).toBe(b);
	});

	it("resetInstance allows a fresh instance to be constructed", () => {
		const { app } = createSeededApp([]);
		const store = createMockSettingsStore();
		const indexer = new Indexer(app, createMockSettingsSubject());

		const a = HierarchyProvider.getInstance(app, indexer, store as any);
		HierarchyProvider.resetInstance();
		const b = HierarchyProvider.getInstance(app, indexer, store as any);

		expect(a).not.toBe(b);
	});
});

describe("HierarchyProvider.buildTree", () => {
	it("delegates to the properties strategy for sourceType='properties'", async () => {
		const { app } = createSeededApp([
			{ path: "Root.md", frontmatter: { Child: wikiLinks("Child") } },
			{ path: "Child.md", frontmatter: {} },
		]);
		const store = createMockSettingsStore();
		const indexer = new Indexer(app, createMockSettingsSubject());
		const provider = HierarchyProvider.getInstance(app, indexer, store as any);

		const tree = await provider.buildTree(tfileFor("Root.md"), "properties");

		expect(tree.children).toHaveLength(1);
		expect(tree.children[0].path).toBe("Child.md");
	});

	it("delegates to MOC strategy for sourceType='moc-content' with mocFilePath", async () => {
		const { app } = createSeededApp([
			{
				path: "MOC.md",
				content: "- [[A]]\n  - [[A/B]]\n",
			},
			{ path: "A.md", frontmatter: {} },
		]);
		const store = createMockSettingsStore();
		const indexer = new Indexer(app, createMockSettingsSubject());
		const provider = HierarchyProvider.getInstance(app, indexer, store as any);

		const tree = await provider.buildTree(tfileFor("MOC.md"), "moc-content", { mocFilePath: "MOC.md" });

		expect(tree.children).toHaveLength(1);
		expect(tree.children[0].name).toBe("A");
	});
});

describe("HierarchyProvider.findChildren / findParents", () => {
	it("findChildren returns children via properties strategy", async () => {
		const { app } = createSeededApp([
			{ path: "Root.md", frontmatter: { Child: wikiLinks("Child") } },
			{ path: "Child.md", frontmatter: {} },
		]);
		const store = createMockSettingsStore();
		const indexer = new Indexer(app, createMockSettingsSubject());
		const provider = HierarchyProvider.getInstance(app, indexer, store as any);

		expect(await provider.findChildren("Root.md", "properties")).toEqual(["Child.md"]);
	});

	it("findParents returns parents via properties strategy", async () => {
		const { app } = createSeededApp([
			{ path: "Parent.md", frontmatter: {} },
			{ path: "Child.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);
		const store = createMockSettingsStore();
		const indexer = new Indexer(app, createMockSettingsSubject());
		const provider = HierarchyProvider.getInstance(app, indexer, store as any);

		expect(await provider.findParents("Child.md", "properties")).toEqual(["Parent.md"]);
	});
});

describe("HierarchyProvider.clearMocCache", () => {
	it("clears the MOC strategy cache (does not crash on subsequent reads)", async () => {
		const { app } = createSeededApp([
			{ path: "MOC.md", content: "- [[A]]\n" },
			{ path: "A.md", frontmatter: {} },
		]);
		const store = createMockSettingsStore();
		const indexer = new Indexer(app, createMockSettingsSubject());
		const provider = HierarchyProvider.getInstance(app, indexer, store as any);

		await provider.buildTree(tfileFor("MOC.md"), "moc-content", { mocFilePath: "MOC.md" });
		provider.clearMocCache("MOC.md");
		const tree = await provider.buildTree(tfileFor("MOC.md"), "moc-content", { mocFilePath: "MOC.md" });

		expect(tree.children).toHaveLength(1);
	});
});
