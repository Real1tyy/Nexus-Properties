import { describe, expect, it } from "vitest";

import { PropertiesStrategy } from "../../../src/core/hierarchy/properties-strategy";
import { Indexer } from "../../../src/core/indexer";
import { createMockSettings, createMockSettingsSubject, createSeededApp, tfileFor, wikiLinks } from "../../fixtures";

function buildStrategy(seed: Parameters<typeof createSeededApp>[0], settings = createMockSettings()) {
	const { app } = createSeededApp(seed);
	const settings$ = createMockSettingsSubject(settings);
	const indexer = new Indexer(app, settings$);
	const strategy = new PropertiesStrategy(app, indexer, () => settings$.value);
	return { app, indexer, strategy };
}

describe("PropertiesStrategy.buildTree", () => {
	it("expands children from frontmatter into a tree", () => {
		const { strategy } = buildStrategy([
			{ path: "Root.md", frontmatter: { Child: wikiLinks("A", "B") } },
			{ path: "A.md", frontmatter: {} },
			{ path: "B.md", frontmatter: { Child: wikiLinks("B1") } },
			{ path: "B1.md", frontmatter: {} },
		]);

		const tree = strategy.buildTree(tfileFor("Root.md"));

		expect(tree.children).toHaveLength(2);
		const b = tree.children.find((c) => c.path === "B.md");
		expect(b?.children[0]?.path).toBe("B1.md");
	});
});

describe("PropertiesStrategy.buildTreeFromTopParent", () => {
	it("walks up to the root before building downward", () => {
		const { strategy } = buildStrategy([
			{ path: "Root.md", frontmatter: { Child: wikiLinks("Mid") } },
			{ path: "Mid.md", frontmatter: { Parent: wikiLinks("Root"), Child: wikiLinks("Leaf") } },
			{ path: "Leaf.md", frontmatter: { Parent: wikiLinks("Mid") } },
		]);

		const tree = strategy.buildTreeFromTopParent(tfileFor("Leaf.md"));

		expect(tree.path).toBe("Root.md");
		const mid = tree.children[0];
		expect(mid?.path).toBe("Mid.md");
		expect(mid?.children[0]?.path).toBe("Leaf.md");
		expect(mid?.children[0]?.isCurrentFile).toBe(true);
	});
});

describe("PropertiesStrategy.findChildren / findParents", () => {
	it("findChildren resolves wiki links to vault paths", () => {
		const { strategy } = buildStrategy([
			{ path: "Folder/Root.md", frontmatter: { Child: wikiLinks("Folder/Child") } },
			{ path: "Folder/Child.md", frontmatter: {} },
		]);

		expect(strategy.findChildren("Folder/Root.md")).toEqual(["Folder/Child.md"]);
	});

	it("findParents resolves wiki links to vault paths", () => {
		const { strategy } = buildStrategy([
			{ path: "Parent.md", frontmatter: {} },
			{ path: "Child.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);

		expect(strategy.findParents("Child.md")).toEqual(["Parent.md"]);
	});

	it("returns empty array when file is missing", () => {
		const { strategy } = buildStrategy([]);

		expect(strategy.findChildren("Ghost.md")).toEqual([]);
		expect(strategy.findParents("Ghost.md")).toEqual([]);
	});

	it("returns empty array when file has no frontmatter", () => {
		const { strategy } = buildStrategy([{ path: "Plain.md" }]);

		expect(strategy.findChildren("Plain.md")).toEqual([]);
		expect(strategy.findParents("Plain.md")).toEqual([]);
	});
});

describe("PropertiesStrategy.collectRelatedNodesRecursively", () => {
	it("walks the related graph and returns reachable nodes", () => {
		const { strategy } = buildStrategy([
			{ path: "A.md", frontmatter: { Related: wikiLinks("B") } },
			{ path: "B.md", frontmatter: { Related: wikiLinks("C") } },
			{ path: "C.md", frontmatter: {} },
		]);

		expect(strategy.collectRelatedNodesRecursively(tfileFor("A.md"), "related")).toEqual(new Set(["B.md", "C.md"]));
	});
});
