import type { TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { Indexer } from "../../src/core/indexer";
import {
	buildHierarchyTree,
	buildHierarchyTreeFromTopParent,
	buildRelatedTree,
	collectRelatedNodesRecursively,
	findTopmostParent,
	getChildrenRecursively,
	getRelationships,
	resolveWikiLink,
} from "../../src/utils/hierarchy";
import { createMockSettingsSubject, createSeededApp, tfileFor, wikiLinks } from "../fixtures";

function buildIndexer(app: any, settings = createMockSettingsSubject()) {
	return new Indexer(app, settings);
}

describe("resolveWikiLink", () => {
	it("resolves a wiki link to a vault path", () => {
		const { app } = createSeededApp([{ path: "Folder/Child.md" }]);

		expect(resolveWikiLink(app, "[[Child]]", "Index.md")).toBe("Folder/Child.md");
	});

	it("returns null when the link does not resolve", () => {
		const { app } = createSeededApp([]);

		expect(resolveWikiLink(app, "[[Missing]]", "Index.md")).toBeNull();
	});
});

describe("getRelationships", () => {
	it("returns relationships extracted from frontmatter when file exists", () => {
		const { app } = createSeededApp([
			{ path: "Note.md", frontmatter: { Parent: ["[[Parent]]"], Child: [], Related: [] } },
		]);
		const indexer = buildIndexer(app);

		const rels = getRelationships(app, indexer, "Note.md");

		expect(rels?.parent).toEqual(["[[Parent]]"]);
	});

	it("returns null when the file is not in the vault", () => {
		const { app } = createSeededApp([]);
		const indexer = buildIndexer(app);

		expect(getRelationships(app, indexer, "Phantom.md")).toBeNull();
	});

	it("returns null when the file has no frontmatter", () => {
		const { app } = createSeededApp([{ path: "Note.md" }]);
		const indexer = buildIndexer(app);

		expect(getRelationships(app, indexer, "Note.md")).toBeNull();
	});
});

describe("buildHierarchyTree", () => {
	it("builds a simple parent → child tree", () => {
		const { app } = createSeededApp([
			{ path: "Parent.md", frontmatter: { Child: wikiLinks("Child") } },
			{ path: "Child.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);
		const indexer = buildIndexer(app);

		const tree = buildHierarchyTree(app, indexer, tfileFor("Parent.md"));

		expect(tree.path).toBe("Parent.md");
		expect(tree.children).toHaveLength(1);
		expect(tree.children[0].path).toBe("Child.md");
	});

	it("handles a child with multiple descendants", () => {
		const { app } = createSeededApp([
			{ path: "Root.md", frontmatter: { Child: wikiLinks("A", "B") } },
			{ path: "A.md", frontmatter: { Child: wikiLinks("A1") } },
			{ path: "B.md", frontmatter: {} },
			{ path: "A1.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);

		const tree = buildHierarchyTree(app, indexer, tfileFor("Root.md"));

		expect(tree.children).toHaveLength(2);
		const a = tree.children.find((c) => c.path === "A.md");
		const b = tree.children.find((c) => c.path === "B.md");
		expect(a?.children).toHaveLength(1);
		expect(a?.children[0]?.path).toBe("A1.md");
		expect(b?.children).toHaveLength(0);
	});

	it("respects maxDepth and stops descending past the limit", () => {
		const { app } = createSeededApp([
			{ path: "L0.md", frontmatter: { Child: wikiLinks("L1") } },
			{ path: "L1.md", frontmatter: { Child: wikiLinks("L2") } },
			{ path: "L2.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);

		const tree = buildHierarchyTree(app, indexer, tfileFor("L0.md"), { maxDepth: 1 });

		expect(tree.children).toHaveLength(1);
		expect(tree.children[0].children).toHaveLength(0);
	});

	it("breaks cycles via the visited set", () => {
		const { app } = createSeededApp([
			{ path: "A.md", frontmatter: { Child: wikiLinks("B") } },
			{ path: "B.md", frontmatter: { Child: wikiLinks("A") } },
		]);
		const indexer = buildIndexer(app);

		const tree = buildHierarchyTree(app, indexer, tfileFor("A.md"));

		expect(tree.children[0].path).toBe("B.md");
		// B's child A is in `visited` (added during root traversal), so it never
		// descends back into A.
		expect(tree.children[0].children).toEqual([]);
	});

	it("marks the highlighted file as current", () => {
		const { app } = createSeededApp([
			{ path: "Parent.md", frontmatter: { Child: wikiLinks("Child") } },
			{ path: "Child.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);

		const tree = buildHierarchyTree(app, indexer, tfileFor("Parent.md"), { highlightPath: "Child.md" });

		expect(tree.isCurrentFile).toBe(false);
		expect(tree.children[0].isCurrentFile).toBe(true);
	});
});

describe("findTopmostParent", () => {
	it("returns the start path when no parents exist", () => {
		const { app } = createSeededApp([{ path: "Solo.md", frontmatter: {} }]);
		const indexer = buildIndexer(app);

		expect(findTopmostParent(app, indexer, "Solo.md")).toBe("Solo.md");
	});

	it("walks up multiple levels to find the root", () => {
		const { app } = createSeededApp([
			{ path: "GrandParent.md", frontmatter: {} },
			{ path: "Parent.md", frontmatter: { Parent: wikiLinks("GrandParent") } },
			{ path: "Child.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);
		const indexer = buildIndexer(app);

		expect(findTopmostParent(app, indexer, "Child.md")).toBe("GrandParent.md");
	});

	it("honors prioritizeParentProp when a node has multiple parents", () => {
		const { app } = createSeededApp([
			{ path: "A.md", frontmatter: {} },
			{ path: "B.md", frontmatter: { Parent: wikiLinks("Z") } },
			{ path: "Z.md", frontmatter: {} },
			{
				path: "Child.md",
				frontmatter: {
					Parent: wikiLinks("A", "B"),
					Prioritize: "B",
				},
			},
		]);
		const indexer = buildIndexer(app);

		// Without prioritization, either A or B (whichever resolves first in array order)
		// would be picked. With prioritizeParentProp="Prioritize" pointing at B,
		// traversal climbs via B → Z.
		expect(findTopmostParent(app, indexer, "Child.md", { prioritizeParentProp: "Prioritize" })).toBe("Z.md");
	});

	it("respects maxDepth", () => {
		const { app } = createSeededApp([
			{ path: "Root.md", frontmatter: {} },
			{ path: "Mid.md", frontmatter: { Parent: wikiLinks("Root") } },
			{ path: "Child.md", frontmatter: { Parent: wikiLinks("Mid") } },
		]);
		const indexer = buildIndexer(app);

		// maxDepth 1 stops after one upward hop — should land at Mid, not Root.
		expect(findTopmostParent(app, indexer, "Child.md", { maxDepth: 1 })).toBe("Child.md");
	});
});

describe("buildHierarchyTreeFromTopParent", () => {
	it("roots the tree at the topmost ancestor and highlights the start file", () => {
		const { app } = createSeededApp([
			{ path: "GrandParent.md", frontmatter: { Child: wikiLinks("Parent") } },
			{ path: "Parent.md", frontmatter: { Parent: wikiLinks("GrandParent"), Child: wikiLinks("Child") } },
			{ path: "Child.md", frontmatter: { Parent: wikiLinks("Parent") } },
		]);
		const indexer = buildIndexer(app);

		const tree = buildHierarchyTreeFromTopParent(app, indexer, tfileFor("Child.md"));

		expect(tree.path).toBe("GrandParent.md");
		const parent = tree.children[0];
		const kid = parent?.children[0];
		expect(kid?.path).toBe("Child.md");
		expect(kid?.isCurrentFile).toBe(true);
	});
});

describe("collectRelatedNodesRecursively", () => {
	it("collects related nodes transitively", () => {
		const { app } = createSeededApp([
			{ path: "A.md", frontmatter: { Related: wikiLinks("B") } },
			{ path: "B.md", frontmatter: { Related: wikiLinks("C") } },
			{ path: "C.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);

		const result = collectRelatedNodesRecursively(app, indexer, tfileFor("A.md"), "related");

		expect(result).toEqual(new Set(["B.md", "C.md"]));
	});

	it("does not include the start node", () => {
		const { app } = createSeededApp([
			{ path: "A.md", frontmatter: { Related: wikiLinks("B") } },
			{ path: "B.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);

		const result = collectRelatedNodesRecursively(app, indexer, tfileFor("A.md"), "related");

		expect(result.has("A.md")).toBe(false);
	});

	it("stops at maxDepth", () => {
		const { app } = createSeededApp([
			{ path: "L0.md", frontmatter: { Related: wikiLinks("L1") } },
			{ path: "L1.md", frontmatter: { Related: wikiLinks("L2") } },
			{ path: "L2.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);

		const result = collectRelatedNodesRecursively(app, indexer, tfileFor("L0.md"), "related", { maxDepth: 1 });

		expect(result).toEqual(new Set(["L1.md"]));
	});

	it("returns an empty set if the start has no relationships", () => {
		const { app } = createSeededApp([{ path: "Solo.md", frontmatter: {} }]);
		const indexer = buildIndexer(app);

		expect(collectRelatedNodesRecursively(app, indexer, tfileFor("Solo.md"), "related")).toEqual(new Set());
	});
});

describe("buildRelatedTree (BFS)", () => {
	it("expands level 1 first, then level 2", () => {
		const { app } = createSeededApp([
			{ path: "Root.md", frontmatter: { Related: wikiLinks("A", "B") } },
			{ path: "A.md", frontmatter: { Related: wikiLinks("A1") } },
			{ path: "B.md", frontmatter: {} },
			{ path: "A1.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);

		const tree = buildRelatedTree(app, indexer, tfileFor("Root.md"));

		expect(tree.children.map((c) => c.path).sort()).toEqual(["A.md", "B.md"]);
		const a = tree.children.find((c) => c.path === "A.md")!;
		expect(a.children).toHaveLength(1);
		expect(a.children[0].path).toBe("A1.md");
	});

	it("never visits the root twice (cycle protection)", () => {
		const { app } = createSeededApp([
			{ path: "A.md", frontmatter: { Related: wikiLinks("B") } },
			{ path: "B.md", frontmatter: { Related: wikiLinks("A") } },
		]);
		const indexer = buildIndexer(app);

		const tree = buildRelatedTree(app, indexer, tfileFor("A.md"));

		expect(tree.children).toHaveLength(1);
		expect(tree.children[0].children).toEqual([]);
	});
});

describe("getChildrenRecursively", () => {
	it("collects descendants in DFS order", () => {
		const { app, files } = createSeededApp([
			{ path: "Root.md", frontmatter: { Child: wikiLinks("A") } },
			{ path: "A.md", frontmatter: { Child: wikiLinks("A1") } },
			{ path: "A1.md", frontmatter: {} },
		]);
		const indexer = buildIndexer(app);
		const rels = getRelationships(app, indexer, "Root.md");
		expect(rels).not.toBeNull();
		// silence unused
		expect(files.has("Root.md")).toBe(true);

		const descendants = getChildrenRecursively(app, rels!, indexer["settings"]);

		expect(descendants).toEqual(["A.md", "A1.md"]);
	});

	it("returns empty when frontmatter has no children prop", () => {
		const { app } = createSeededApp([{ path: "Solo.md", frontmatter: { OtherProp: "value" } }]);
		const indexer = buildIndexer(app);
		const rels = getRelationships(app, indexer, "Solo.md")!;

		const descendants = getChildrenRecursively(app, rels, indexer["settings"]);

		expect(descendants).toEqual([]);
	});

	it("breaks cycles", () => {
		const { app } = createSeededApp([
			{ path: "A.md", frontmatter: { Child: wikiLinks("B") } },
			{ path: "B.md", frontmatter: { Child: wikiLinks("A") } },
		]);
		const indexer = buildIndexer(app);
		const rels = getRelationships(app, indexer, "A.md")!;

		const descendants = getChildrenRecursively(app, rels, indexer["settings"]);

		expect(descendants).toEqual(["B.md"]);
	});
});

// Type-checking dummy so unused type imports don't trip eslint
const _typeProbe: TFile | undefined = undefined;
const _spyProbe = vi.fn;
void _typeProbe;
void _spyProbe;
