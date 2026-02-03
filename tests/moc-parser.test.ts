import { describe, expect, it } from "vitest";
import {
	extractWikiLinksFromLine,
	findAncestorPaths,
	findMocNode,
	getSubtree,
	parseMocContent,
} from "../src/utils/moc-parser";

describe("extractWikiLinksFromLine", () => {
	it("extracts simple wikilink", () => {
		const result = extractWikiLinksFromLine("- [[Note Name]]");
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			wikiLink: "[[Note Name]]",
			notePath: "Note Name",
			displayText: "Note Name",
		});
	});

	it("extracts wikilink with alias", () => {
		const result = extractWikiLinksFromLine("- [[Note Name|Display Text]]");
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			wikiLink: "[[Note Name|Display Text]]",
			notePath: "Note Name",
			displayText: "Display Text",
		});
	});

	it("extracts wikilink with folder path", () => {
		const result = extractWikiLinksFromLine("- [[folder/subfolder/Note]]");
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			wikiLink: "[[folder/subfolder/Note]]",
			notePath: "folder/subfolder/Note",
			displayText: "Note",
		});
	});

	it("extracts multiple wikilinks from same line", () => {
		const result = extractWikiLinksFromLine("- [[First Note]] see also [[Second Note]]");
		expect(result).toHaveLength(2);
		expect(result[0].notePath).toBe("First Note");
		expect(result[1].notePath).toBe("Second Note");
	});

	it("extracts wikilinks mixed with plain text", () => {
		const result = extractWikiLinksFromLine("some text [[Note]] more text [[Another]]");
		expect(result).toHaveLength(2);
		expect(result[0].notePath).toBe("Note");
		expect(result[1].notePath).toBe("Another");
	});

	it("returns empty array for line without wikilinks", () => {
		const result = extractWikiLinksFromLine("- just plain text");
		expect(result).toHaveLength(0);
	});

	it("handles empty string", () => {
		const result = extractWikiLinksFromLine("");
		expect(result).toHaveLength(0);
	});

	it("trims whitespace from note path", () => {
		const result = extractWikiLinksFromLine("[[  Note With Spaces  ]]");
		expect(result[0].notePath).toBe("Note With Spaces");
	});

	it("trims whitespace from alias", () => {
		const result = extractWikiLinksFromLine("[[Note|  Alias With Spaces  ]]");
		expect(result[0].displayText).toBe("Alias With Spaces");
	});
});

describe("parseMocContent", () => {
	describe("bullet markers", () => {
		it("parses dash bullet items", () => {
			const content = `- [[Note One]]
- [[Note Two]]`;
			const result = parseMocContent(content);
			expect(result.roots).toHaveLength(2);
			expect(result.roots[0].notePath).toBe("Note One");
			expect(result.roots[1].notePath).toBe("Note Two");
		});

		it("parses dot bullet items", () => {
			const content = `. [[Note One]]
. [[Note Two]]`;
			const result = parseMocContent(content);
			expect(result.roots).toHaveLength(2);
			expect(result.roots[0].notePath).toBe("Note One");
			expect(result.roots[1].notePath).toBe("Note Two");
		});

		it("parses mixed dash and dot bullets", () => {
			const content = `- [[Dash Note]]
. [[Dot Note]]
- [[Another Dash]]`;
			const result = parseMocContent(content);
			expect(result.roots).toHaveLength(3);
			expect(result.roots[0].notePath).toBe("Dash Note");
			expect(result.roots[1].notePath).toBe("Dot Note");
			expect(result.roots[2].notePath).toBe("Another Dash");
		});
	});

	describe("nested hierarchy", () => {
		it("parses simple parent-child with spaces", () => {
			const content = `- [[Parent]]
  - [[Child]]`;
			const result = parseMocContent(content);
			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].notePath).toBe("Parent");
			expect(result.roots[0].children).toHaveLength(1);
			expect(result.roots[0].children[0].notePath).toBe("Child");
		});

		it("parses simple parent-child with tabs", () => {
			const content = `- [[Parent]]
\t- [[Child]]`;
			const result = parseMocContent(content);
			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].children).toHaveLength(1);
			expect(result.roots[0].children[0].notePath).toBe("Child");
		});

		it("parses deeply nested hierarchy", () => {
			const content = `- [[Level 0]]
  - [[Level 1]]
    - [[Level 2]]
      - [[Level 3]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			const l0 = result.roots[0];
			expect(l0.notePath).toBe("Level 0");

			expect(l0.children).toHaveLength(1);
			const l1 = l0.children[0];
			expect(l1.notePath).toBe("Level 1");

			expect(l1.children).toHaveLength(1);
			const l2 = l1.children[0];
			expect(l2.notePath).toBe("Level 2");

			expect(l2.children).toHaveLength(1);
			const l3 = l2.children[0];
			expect(l3.notePath).toBe("Level 3");
		});

		it("parses multiple children at same level", () => {
			const content = `- [[Parent]]
  - [[Child 1]]
  - [[Child 2]]
  - [[Child 3]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].children).toHaveLength(3);
			expect(result.roots[0].children[0].notePath).toBe("Child 1");
			expect(result.roots[0].children[1].notePath).toBe("Child 2");
			expect(result.roots[0].children[2].notePath).toBe("Child 3");
		});

		it("parses complex tree structure", () => {
			const content = `- [[Root 1]]
  - [[Child 1.1]]
    - [[Grandchild 1.1.1]]
  - [[Child 1.2]]
- [[Root 2]]
  - [[Child 2.1]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(2);

			// Root 1 structure
			expect(result.roots[0].notePath).toBe("Root 1");
			expect(result.roots[0].children).toHaveLength(2);
			expect(result.roots[0].children[0].notePath).toBe("Child 1.1");
			expect(result.roots[0].children[0].children).toHaveLength(1);
			expect(result.roots[0].children[0].children[0].notePath).toBe("Grandchild 1.1.1");
			expect(result.roots[0].children[1].notePath).toBe("Child 1.2");

			// Root 2 structure
			expect(result.roots[1].notePath).toBe("Root 2");
			expect(result.roots[1].children).toHaveLength(1);
			expect(result.roots[1].children[0].notePath).toBe("Child 2.1");
		});

		it("handles jumping back to shallower level", () => {
			const content = `- [[A]]
  - [[B]]
    - [[C]]
  - [[D]]`;
			const result = parseMocContent(content);

			expect(result.roots[0].children).toHaveLength(2);
			expect(result.roots[0].children[0].notePath).toBe("B");
			expect(result.roots[0].children[0].children[0].notePath).toBe("C");
			expect(result.roots[0].children[1].notePath).toBe("D");
			expect(result.roots[0].children[1].children).toHaveLength(0);
		});
	});

	describe("allLinks collection", () => {
		it("collects all wikilinks from tree", () => {
			const content = `- [[A]]
  - [[B]]
    - [[C]]
- [[D]]`;
			const result = parseMocContent(content);

			expect(result.allLinks.size).toBe(4);
			expect(result.allLinks.has("A")).toBe(true);
			expect(result.allLinks.has("B")).toBe(true);
			expect(result.allLinks.has("C")).toBe(true);
			expect(result.allLinks.has("D")).toBe(true);
		});
	});

	describe("frontmatter handling", () => {
		it("ignores wiki links in frontmatter", () => {
			const content = `---
Author:
  - "[[Authors/Alex Becker|Alex Becker]]"
Related: []
Title: "[[Books/Some Book|Some Book]]"
---
## Summary:

## Related Books:
- [[Books/Rich dad, poor dad|Rich Dad, Poor Dad]]
    - [[Books/Cashflow Quadrant|Cashflow Quadrant]]`;
			const result = parseMocContent(content);

			// Should only parse the bullet list items, not frontmatter
			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].notePath).toBe("Books/Rich dad, poor dad");
			expect(result.roots[0].children).toHaveLength(1);
			expect(result.roots[0].children[0].notePath).toBe("Books/Cashflow Quadrant");

			// allLinks should only contain links from bullet items
			expect(result.allLinks.size).toBe(2);
			expect(result.allLinks.has("Books/Rich dad, poor dad")).toBe(true);
			expect(result.allLinks.has("Books/Cashflow Quadrant")).toBe(true);
			expect(result.allLinks.has("Authors/Alex Becker")).toBe(false);
			expect(result.allLinks.has("Books/Some Book")).toBe(false);
		});

		it("ignores complex frontmatter with nested wiki links", () => {
			const content = `---
Parent:
  - "[[Parent Note]]"
Child:
  - "[[Child Note 1]]"
  - "[[Child Note 2]]"
Related:
  - "[[Related 1]]"
  - "[[Related 2]]"
---
- [[Actual Content]]
  - [[Actual Child]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].notePath).toBe("Actual Content");
			expect(result.roots[0].children).toHaveLength(1);
			expect(result.roots[0].children[0].notePath).toBe("Actual Child");
			expect(result.allLinks.size).toBe(2);
		});

		it("handles content without frontmatter", () => {
			const content = `- [[Note One]]
- [[Note Two]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(2);
			expect(result.roots[0].notePath).toBe("Note One");
			expect(result.roots[1].notePath).toBe("Note Two");
		});

		it("handles frontmatter-only content", () => {
			const content = `---
Author: "[[Some Author]]"
Title: "[[Some Title]]"
---`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(0);
			expect(result.allLinks.size).toBe(0);
		});

		it("handles frontmatter with bullet-like lines inside", () => {
			const content = `---
Notes:
  - "[[Frontmatter Link 1]]"
  - "[[Frontmatter Link 2]]"
---
## Content
- [[Body Link]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].notePath).toBe("Body Link");
			expect(result.allLinks.has("Frontmatter Link 1")).toBe(false);
			expect(result.allLinks.has("Frontmatter Link 2")).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("handles empty content", () => {
			const result = parseMocContent("");
			expect(result.roots).toHaveLength(0);
			expect(result.allLinks.size).toBe(0);
		});

		it("ignores lines without wikilinks", () => {
			const content = `- plain text
- [[Valid Note]]
- more plain text`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].notePath).toBe("Valid Note");
		});

		it("ignores non-bullet lines", () => {
			const content = `# Header
[[Not a bullet]]
- [[Bullet Note]]
Regular paragraph`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].notePath).toBe("Bullet Note");
		});

		it("uses first wikilink when line has multiple", () => {
			const content = `- [[Primary]] see also [[Secondary]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].notePath).toBe("Primary");
		});

		it("handles 4-space indentation", () => {
			const content = `- [[Parent]]
    - [[Child]]`;
			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			expect(result.roots[0].children).toHaveLength(1);
		});

		it("handles mixed tabs and spaces", () => {
			const content = `- [[Parent]]
\t- [[Child 1]]
  - [[Child 2]]`;
			const result = parseMocContent(content);

			// Both should be children (tabs = 4 spaces, so both at level 2)
			expect(result.roots[0].children.length).toBeGreaterThanOrEqual(1);
		});

		it("handles wikilinks with aliases correctly", () => {
			const content = `- [[folder/Note|Display Name]]`;
			const result = parseMocContent(content);

			expect(result.roots[0].notePath).toBe("folder/Note");
			expect(result.roots[0].displayText).toBe("Display Name");
			expect(result.allLinks.has("folder/Note")).toBe(true);
		});
	});

	describe("real-world MOC example", () => {
		it("parses Luhmann example from requirements", () => {
			const content = `- [[Influences on Luhmann's Systems Theory]]
    - [[Cassirer, Ernst]]
        - [[Substance vs. Function (Cassirer)]]
            - [[Concept of Substance]]
            - [[Concept of Function]]
        - [[Mentions of Cassirer in Luhmann]]
    - [[Husserl, Edmund]]`;

			const result = parseMocContent(content);

			expect(result.roots).toHaveLength(1);
			const root = result.roots[0];
			expect(root.notePath).toBe("Influences on Luhmann's Systems Theory");
			expect(root.children).toHaveLength(2);

			const cassirer = root.children[0];
			expect(cassirer.notePath).toBe("Cassirer, Ernst");
			expect(cassirer.children).toHaveLength(2);

			const substanceVsFunction = cassirer.children[0];
			expect(substanceVsFunction.notePath).toBe("Substance vs. Function (Cassirer)");
			expect(substanceVsFunction.children).toHaveLength(2);
			expect(substanceVsFunction.children[0].notePath).toBe("Concept of Substance");
			expect(substanceVsFunction.children[1].notePath).toBe("Concept of Function");

			expect(cassirer.children[1].notePath).toBe("Mentions of Cassirer in Luhmann");

			const husserl = root.children[1];
			expect(husserl.notePath).toBe("Husserl, Edmund");
			expect(husserl.children).toHaveLength(0);

			expect(result.allLinks.size).toBe(7);
		});
	});
});

describe("findMocNode", () => {
	const content = `- [[A]]
  - [[B]]
    - [[C]]
- [[D]]`;

	it("finds root node", () => {
		const { roots } = parseMocContent(content);
		const node = findMocNode(roots, "A");
		expect(node).toBeDefined();
		expect(node?.notePath).toBe("A");
	});

	it("finds deeply nested node", () => {
		const { roots } = parseMocContent(content);
		const node = findMocNode(roots, "C");
		expect(node).toBeDefined();
		expect(node?.notePath).toBe("C");
	});

	it("returns undefined for non-existent node", () => {
		const { roots } = parseMocContent(content);
		const node = findMocNode(roots, "NonExistent");
		expect(node).toBeUndefined();
	});

	it("returns undefined for empty tree", () => {
		const node = findMocNode([], "A");
		expect(node).toBeUndefined();
	});
});

describe("getSubtree", () => {
	const content = `- [[A]]
  - [[B]]
    - [[C]]
      - [[D]]`;

	it("returns subtree starting from node", () => {
		const { roots } = parseMocContent(content);
		const subtree = getSubtree(roots, "B");

		expect(subtree).toBeDefined();
		expect(subtree?.notePath).toBe("B");
		expect(subtree?.children).toHaveLength(1);
		expect(subtree?.children[0].notePath).toBe("C");
	});

	it("returns undefined for non-existent node", () => {
		const { roots } = parseMocContent(content);
		const subtree = getSubtree(roots, "Z");
		expect(subtree).toBeUndefined();
	});
});

describe("findAncestorPaths", () => {
	const content = `- [[A]]
  - [[B]]
    - [[C]]
      - [[D]]
- [[E]]`;

	it("returns empty array for root node", () => {
		const { roots } = parseMocContent(content);
		const ancestors = findAncestorPaths(roots, "A");
		expect(ancestors).toEqual([]);
	});

	it("returns parent for direct child", () => {
		const { roots } = parseMocContent(content);
		const ancestors = findAncestorPaths(roots, "B");
		expect(ancestors).toEqual(["A"]);
	});

	it("returns full ancestor chain for deeply nested node", () => {
		const { roots } = parseMocContent(content);
		const ancestors = findAncestorPaths(roots, "D");
		expect(ancestors).toEqual(["A", "B", "C"]);
	});

	it("returns empty array for non-existent node", () => {
		const { roots } = parseMocContent(content);
		const ancestors = findAncestorPaths(roots, "NonExistent");
		expect(ancestors).toEqual([]);
	});

	it("works with multiple root trees", () => {
		const { roots } = parseMocContent(content);
		const ancestors = findAncestorPaths(roots, "E");
		expect(ancestors).toEqual([]);
	});
});
