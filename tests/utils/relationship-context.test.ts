import { describe, expect, it } from "vitest";

import { RELATIONSHIP_CONFIGS } from "../../src/types/constants";
import {
	captureInverseRelationships,
	getRelationshipContext,
	getRelationshipDiff,
} from "../../src/utils/relationship-context";
import { createMockSettings, createSeededApp, makeFrontmatter, makeRelationships, wikiLinks } from "../fixtures";

const PARENT_CONFIG = RELATIONSHIP_CONFIGS.find((c) => c.type === "parent")!;
const CHILDREN_CONFIG = RELATIONSHIP_CONFIGS.find((c) => c.type === "children")!;
const RELATED_CONFIG = RELATIONSHIP_CONFIGS.find((c) => c.type === "related")!;

describe("getRelationshipContext", () => {
	it("returns the correct prop names and parsed paths for parent", () => {
		const settings = createMockSettings({ parentProp: "Parent", childrenProp: "Child" });
		const rels = makeRelationships({ parent: wikiLinks("Parent", "Parent2") });

		const ctx = getRelationshipContext(PARENT_CONFIG, rels, settings);

		expect(ctx.propName).toBe("Parent");
		expect(ctx.reversePropName).toBe("Child");
		expect(ctx.paths).toEqual(["Parent", "Parent2"]);
	});

	it("returns same propName as reversePropName for related (symmetric)", () => {
		const settings = createMockSettings({ relatedProp: "Related" });
		const rels = makeRelationships({ related: wikiLinks("Alice") });

		const ctx = getRelationshipContext(RELATED_CONFIG, rels, settings);

		expect(ctx.propName).toBe("Related");
		expect(ctx.reversePropName).toBe("Related");
		expect(ctx.paths).toEqual(["Alice"]);
	});

	it("returns the children/parent inversion for children", () => {
		const settings = createMockSettings({ parentProp: "Parent", childrenProp: "Child" });
		const rels = makeRelationships({ children: wikiLinks("Child") });

		const ctx = getRelationshipContext(CHILDREN_CONFIG, rels, settings);

		expect(ctx.propName).toBe("Child");
		expect(ctx.reversePropName).toBe("Parent");
	});
});

describe("getRelationshipDiff", () => {
	const settings = createMockSettings({ parentProp: "Parent", childrenProp: "Child" });

	it("reports added links when new has extras", () => {
		const oldRels = makeRelationships({ parent: wikiLinks("Parent") });
		const newRels = makeRelationships({ parent: wikiLinks("Parent", "Parent2", "Parent3") });

		const diff = getRelationshipDiff(PARENT_CONFIG, oldRels, newRels, settings);

		expect(diff.addedLinks).toEqual(["Parent2", "Parent3"]);
		expect(diff.removedLinks).toEqual([]);
	});

	it("reports removed links when old had extras", () => {
		const oldRels = makeRelationships({ parent: wikiLinks("Parent", "Parent2") });
		const newRels = makeRelationships({ parent: wikiLinks("Parent2") });

		const diff = getRelationshipDiff(PARENT_CONFIG, oldRels, newRels, settings);

		expect(diff.addedLinks).toEqual([]);
		expect(diff.removedLinks).toEqual(["Parent"]);
	});

	it("reports both added and removed for a swap", () => {
		const oldRels = makeRelationships({ parent: wikiLinks("Parent") });
		const newRels = makeRelationships({ parent: wikiLinks("Parent2") });

		const diff = getRelationshipDiff(PARENT_CONFIG, oldRels, newRels, settings);

		expect(diff.addedLinks).toEqual(["Parent2"]);
		expect(diff.removedLinks).toEqual(["Parent"]);
	});

	it("reports no changes when sets are equal", () => {
		const links = wikiLinks("Parent", "Parent2");
		const oldRels = makeRelationships({ parent: links });
		const newRels = makeRelationships({ parent: [...links] });

		const diff = getRelationshipDiff(PARENT_CONFIG, oldRels, newRels, settings);

		expect(diff.addedLinks).toEqual([]);
		expect(diff.removedLinks).toEqual([]);
	});

	it("exposes the same fields as getRelationshipContext", () => {
		const oldRels = makeRelationships();
		const newRels = makeRelationships({ parent: wikiLinks("Parent") });

		const diff = getRelationshipDiff(PARENT_CONFIG, oldRels, newRels, settings);

		expect(diff.propName).toBe("Parent");
		expect(diff.reversePropName).toBe("Child");
		expect(diff.paths).toEqual(["Parent"]);
	});
});

describe("captureInverseRelationships", () => {
	it("emits one inverse per resolved parent and child link", () => {
		const { app } = createSeededApp([
			{ path: "Parent.md", frontmatter: {} },
			{ path: "Child.md", frontmatter: {} },
		]);
		const settings = createMockSettings({ parentProp: "Parent", childrenProp: "Child" });
		const frontmatter = makeFrontmatter({
			parent: wikiLinks("Parent"),
			children: wikiLinks("Child"),
		});

		const inverses = captureInverseRelationships(app, "Note.md", frontmatter, settings);

		// Parent → inverse on Parent under "Child"
		expect(inverses).toContainEqual({ targetFilePath: "Parent.md", propertyName: "Child" });
		// Children → inverse on Child under "Parent"
		expect(inverses).toContainEqual({ targetFilePath: "Child.md", propertyName: "Parent" });
		expect(inverses).toHaveLength(2);
	});

	it("skips links that don't resolve to any vault file", () => {
		const { app } = createSeededApp([]);
		const settings = createMockSettings();
		const frontmatter = makeFrontmatter({ parent: wikiLinks("Ghost") });

		const inverses = captureInverseRelationships(app, "Note.md", frontmatter, settings);

		expect(inverses).toEqual([]);
	});

	it("handles related-prop self-inversion", () => {
		const { app } = createSeededApp([{ path: "Alice.md", frontmatter: {} }]);
		const settings = createMockSettings({ relatedProp: "Related" });
		const frontmatter = makeFrontmatter({ related: wikiLinks("Alice") });

		const inverses = captureInverseRelationships(app, "Note.md", frontmatter, settings);

		expect(inverses).toContainEqual({ targetFilePath: "Alice.md", propertyName: "Related" });
	});
});
