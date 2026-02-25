import { describe, expect, it } from "vitest";
import type { FileRelationships } from "../src/types/constants";
import { type LinkResolver, computeVaultStatistics } from "../src/utils/vault-statistics";

function makeNode(
	filePath: string,
	opts: { parent?: string[]; children?: string[]; related?: string[] } = {}
): FileRelationships {
	return {
		filePath,
		mtime: 0,
		parent: opts.parent ?? [],
		children: opts.children ?? [],
		related: opts.related ?? [],
		frontmatter: {},
	};
}

/**
 * Simple resolver that strips [[]] and looks up the result directly in the cache.
 * Simulates what extractFilePath + getFirstLinkpathDest does in production.
 */
function wikiLinkResolver(cache: ReadonlyMap<string, FileRelationships>): LinkResolver {
	return (link: string) => {
		// Strip [[ ]] and |alias, mimicking extractFilePath behavior
		let cleaned = link.trim();
		const wikiMatch = cleaned.match(/^\[\[([^\]]+)\]\]$/);
		if (wikiMatch) {
			cleaned = wikiMatch[1];
			const pipeIdx = cleaned.indexOf("|");
			if (pipeIdx !== -1) {
				cleaned = cleaned.substring(0, pipeIdx).trim();
			}
		}
		return cache.has(cleaned) ? cleaned : null;
	};
}

describe("computeVaultStatistics", () => {
	it("returns zeros for an empty cache", () => {
		const cache = new Map<string, FileRelationships>();
		const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

		expect(stats).toEqual({
			totalNodes: 0,
			treeCount: 0,
			avgDepth: 0,
			maxDepth: 0,
			nodesWithParents: 0,
			nodesWithChildren: 0,
			nodesWithRelated: 0,
		});
	});

	it("counts a single root node with no relationships", () => {
		const cache = new Map<string, FileRelationships>();
		cache.set("a.md", makeNode("a.md"));

		const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

		expect(stats.totalNodes).toBe(1);
		expect(stats.treeCount).toBe(1);
		expect(stats.maxDepth).toBe(0);
		expect(stats.avgDepth).toBe(0);
		expect(stats.nodesWithParents).toBe(0);
		expect(stats.nodesWithChildren).toBe(0);
		expect(stats.nodesWithRelated).toBe(0);
	});

	it("counts relationship types correctly", () => {
		const cache = new Map<string, FileRelationships>();
		cache.set("root.md", makeNode("root.md", { children: ["[[child.md]]"], related: ["[[other.md]]"] }));
		cache.set("child.md", makeNode("child.md", { parent: ["[[root.md]]"] }));
		cache.set("other.md", makeNode("other.md", { related: ["[[root.md]]"] }));

		const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

		expect(stats.totalNodes).toBe(3);
		expect(stats.nodesWithParents).toBe(1);
		expect(stats.nodesWithChildren).toBe(1);
		expect(stats.nodesWithRelated).toBe(2);
	});

	describe("tree depth — wiki link format", () => {
		it("computes depth 1 for root with one level of children", () => {
			const cache = new Map<string, FileRelationships>();
			cache.set("root.md", makeNode("root.md", { children: ["[[a.md]]", "[[b.md]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[root.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(1);
			expect(stats.maxDepth).toBe(1);
			expect(stats.avgDepth).toBe(1);
		});

		it("computes depth 3 for a chain: root -> A -> B -> C", () => {
			const cache = new Map<string, FileRelationships>();
			cache.set("root.md", makeNode("root.md", { children: ["[[a.md]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root.md]]"], children: ["[[b.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[a.md]]"], children: ["[[c.md]]"] }));
			cache.set("c.md", makeNode("c.md", { parent: ["[[b.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(1);
			expect(stats.maxDepth).toBe(3);
			expect(stats.avgDepth).toBe(3);
		});

		it("computes depth 1 for a wide tree", () => {
			const cache = new Map<string, FileRelationships>();
			const childLinks = ["[[a.md]]", "[[b.md]]", "[[c.md]]", "[[d.md]]", "[[e.md]]"];
			const childPaths = ["a.md", "b.md", "c.md", "d.md", "e.md"];
			cache.set("root.md", makeNode("root.md", { children: childLinks }));
			for (const child of childPaths) {
				cache.set(child, makeNode(child, { parent: ["[[root.md]]"] }));
			}

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.maxDepth).toBe(1);
			expect(stats.nodesWithChildren).toBe(1);
			expect(stats.nodesWithParents).toBe(5);
		});

		it("handles wiki links with aliases (pipe syntax)", () => {
			const cache = new Map<string, FileRelationships>();
			cache.set("root.md", makeNode("root.md", { children: ["[[a.md|Display Name]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root.md]]"], children: ["[[b.md|Another Name]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[a.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.maxDepth).toBe(2);
		});
	});

	describe("average depth across multiple trees", () => {
		it("averages depth across two trees", () => {
			const cache = new Map<string, FileRelationships>();

			// Tree 1: depth 1 (root1 -> child1)
			cache.set("root1.md", makeNode("root1.md", { children: ["[[child1.md]]"] }));
			cache.set("child1.md", makeNode("child1.md", { parent: ["[[root1.md]]"] }));

			// Tree 2: depth 3 (root2 -> a -> b -> c)
			cache.set("root2.md", makeNode("root2.md", { children: ["[[a.md]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root2.md]]"], children: ["[[b.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[a.md]]"], children: ["[[c.md]]"] }));
			cache.set("c.md", makeNode("c.md", { parent: ["[[b.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(2);
			expect(stats.maxDepth).toBe(3);
			expect(stats.avgDepth).toBe(2); // (1 + 3) / 2
		});

		it("handles isolated roots (depth 0) correctly in average", () => {
			const cache = new Map<string, FileRelationships>();
			cache.set("lone1.md", makeNode("lone1.md"));
			cache.set("lone2.md", makeNode("lone2.md"));
			cache.set("lone3.md", makeNode("lone3.md"));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(3);
			expect(stats.maxDepth).toBe(0);
			expect(stats.avgDepth).toBe(0);
		});

		it("averages correctly with mix of zero-depth and deep trees", () => {
			const cache = new Map<string, FileRelationships>();

			// Tree 1: isolated root (depth 0)
			cache.set("lone.md", makeNode("lone.md"));

			// Tree 2: depth 2 (root -> a -> b)
			cache.set("root.md", makeNode("root.md", { children: ["[[a.md]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root.md]]"], children: ["[[b.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[a.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(2);
			expect(stats.maxDepth).toBe(2);
			expect(stats.avgDepth).toBe(1); // (0 + 2) / 2
		});

		it("rounds average to 2 decimal places", () => {
			const cache = new Map<string, FileRelationships>();

			// Tree 1: depth 1
			cache.set("r1.md", makeNode("r1.md", { children: ["[[c1.md]]"] }));
			cache.set("c1.md", makeNode("c1.md", { parent: ["[[r1.md]]"] }));

			// Tree 2: depth 2
			cache.set("r2.md", makeNode("r2.md", { children: ["[[c2.md]]"] }));
			cache.set("c2.md", makeNode("c2.md", { parent: ["[[r2.md]]"], children: ["[[c3.md]]"] }));
			cache.set("c3.md", makeNode("c3.md", { parent: ["[[c2.md]]"] }));

			// Tree 3: depth 0
			cache.set("r3.md", makeNode("r3.md"));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(3);
			expect(stats.maxDepth).toBe(2);
			expect(stats.avgDepth).toBe(1); // (1 + 2 + 0) / 3 = 1.0
		});
	});

	describe("link resolution edge cases", () => {
		it("skips children that cannot be resolved", () => {
			const cache = new Map<string, FileRelationships>();
			cache.set("root.md", makeNode("root.md", { children: ["[[nonexistent.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(1);
			expect(stats.maxDepth).toBe(0);
			expect(stats.nodesWithChildren).toBe(1);
		});

		it("uses the provided link resolver for custom resolution", () => {
			const cache = new Map<string, FileRelationships>();
			cache.set("folder/root.md", makeNode("folder/root.md", { children: ["[[Child]]"] }));
			cache.set("folder/Child.md", makeNode("folder/Child.md", { parent: ["[[folder/root.md]]"] }));

			const resolver: LinkResolver = (link: string) => {
				const cleaned = link.replace(/^\[\[|\]\]$/g, "");
				if (cleaned === "Child") return "folder/Child.md";
				return null;
			};

			const stats = computeVaultStatistics(cache, resolver);

			expect(stats.maxDepth).toBe(1);
		});

		it("handles partially resolvable tree (some children missing)", () => {
			const cache = new Map<string, FileRelationships>();
			// root has 3 children, but only 2 exist in cache
			cache.set("root.md", makeNode("root.md", { children: ["[[a.md]]", "[[missing.md]]", "[[b.md]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root.md]]"], children: ["[[deep.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[root.md]]"] }));
			cache.set("deep.md", makeNode("deep.md", { parent: ["[[a.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.maxDepth).toBe(2); // root -> a -> deep
			expect(stats.totalNodes).toBe(4);
		});
	});

	describe("cycle safety", () => {
		it("does not loop infinitely on cycles in children links", () => {
			const cache = new Map<string, FileRelationships>();
			cache.set("a.md", makeNode("a.md", { children: ["[[b.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[a.md]]"], children: ["[[c.md]]"] }));
			cache.set("c.md", makeNode("c.md", { parent: ["[[b.md]]"], children: ["[[a.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.totalNodes).toBe(3);
			expect(stats.maxDepth).toBe(2); // a -> b -> c (cycle back to a is skipped)
		});
	});

	describe("branching trees", () => {
		it("computes max depth for an asymmetric tree", () => {
			const cache = new Map<string, FileRelationships>();
			//       root
			//      /    \
			//     a      b
			//     |
			//     c
			//     |
			//     d
			cache.set("root.md", makeNode("root.md", { children: ["[[a.md]]", "[[b.md]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root.md]]"], children: ["[[c.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[root.md]]"] }));
			cache.set("c.md", makeNode("c.md", { parent: ["[[a.md]]"], children: ["[[d.md]]"] }));
			cache.set("d.md", makeNode("d.md", { parent: ["[[c.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(1);
			expect(stats.maxDepth).toBe(3); // root -> a -> c -> d
			expect(stats.totalNodes).toBe(5);
			expect(stats.nodesWithParents).toBe(4);
			expect(stats.nodesWithChildren).toBe(3); // root, a, c
		});

		it("computes depth for a balanced binary tree (depth 3)", () => {
			const cache = new Map<string, FileRelationships>();
			//          root
			//        /      \
			//       a        b
			//      / \      / \
			//     c   d    e   f
			//     |
			//     g
			cache.set("root.md", makeNode("root.md", { children: ["[[a.md]]", "[[b.md]]"] }));
			cache.set("a.md", makeNode("a.md", { parent: ["[[root.md]]"], children: ["[[c.md]]", "[[d.md]]"] }));
			cache.set("b.md", makeNode("b.md", { parent: ["[[root.md]]"], children: ["[[e.md]]", "[[f.md]]"] }));
			cache.set("c.md", makeNode("c.md", { parent: ["[[a.md]]"], children: ["[[g.md]]"] }));
			cache.set("d.md", makeNode("d.md", { parent: ["[[a.md]]"] }));
			cache.set("e.md", makeNode("e.md", { parent: ["[[b.md]]"] }));
			cache.set("f.md", makeNode("f.md", { parent: ["[[b.md]]"] }));
			cache.set("g.md", makeNode("g.md", { parent: ["[[c.md]]"] }));

			const stats = computeVaultStatistics(cache, wikiLinkResolver(cache));

			expect(stats.treeCount).toBe(1);
			expect(stats.maxDepth).toBe(3); // root -> a -> c -> g
			expect(stats.totalNodes).toBe(8);
		});
	});
});
