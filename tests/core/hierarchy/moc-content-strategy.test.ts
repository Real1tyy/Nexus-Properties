import { describe, expect, it } from "vitest";

import { MocContentStrategy } from "../../../src/core/hierarchy/moc-content-strategy";
import { Indexer } from "../../../src/core/indexer";
import { createMockSettings, createMockSettingsSubject, createSeededApp, tfileFor } from "../../fixtures";

function buildStrategy(seed: Parameters<typeof createSeededApp>[0]) {
	const { app } = createSeededApp(seed);
	const settings$ = createMockSettingsSubject(createMockSettings());
	const indexer = new Indexer(app, settings$);
	const strategy = new MocContentStrategy(app, indexer, () => settings$.value);
	return { app, strategy };
}

const MOC_CONTENT = `# Map of Content
- [[Project A]]
  - [[Project A/Task 1]]
  - [[Project A/Task 2]]
- [[Project B]]
  - [[Project B/Task 1]]
`;

describe("MocContentStrategy.loadMocDataAsync", () => {
	it("parses bullet-list content into a hierarchy cache", async () => {
		const { strategy } = buildStrategy([
			{ path: "MOC.md", content: MOC_CONTENT },
			{ path: "Project A.md", frontmatter: {} },
			{ path: "Project B.md", frontmatter: {} },
		]);

		const { roots } = await strategy.loadMocDataAsync("MOC.md");

		expect(roots).toHaveLength(2);
		expect(roots[0].displayText).toBe("Project A");
		expect(roots[0].children).toHaveLength(2);
	});

	it("caches the parsed result on second call", async () => {
		const { app, strategy } = buildStrategy([{ path: "MOC.md", content: MOC_CONTENT }]);

		const first = await strategy.loadMocDataAsync("MOC.md");
		const second = await strategy.loadMocDataAsync("MOC.md");

		expect(second).toBe(first);
		expect((app.vault.cachedRead as any).mock.calls).toHaveLength(1);
	});

	it("returns empty data when MOC file does not exist", async () => {
		const { strategy } = buildStrategy([]);

		const { roots, allLinks } = await strategy.loadMocDataAsync("Missing.md");

		expect(roots).toEqual([]);
		expect(allLinks).toEqual(new Set());
	});
});

describe("MocContentStrategy.clearCache", () => {
	it("clears a specific MOC file from the cache", async () => {
		const { app, strategy } = buildStrategy([{ path: "MOC.md", content: MOC_CONTENT }]);

		await strategy.loadMocDataAsync("MOC.md");
		strategy.clearCache("MOC.md");
		await strategy.loadMocDataAsync("MOC.md");

		// cachedRead called twice if cache was cleared
		expect((app.vault.cachedRead as any).mock.calls).toHaveLength(2);
	});

	it("clears the entire cache when called without an argument", async () => {
		const { app, strategy } = buildStrategy([{ path: "MOC.md", content: MOC_CONTENT }]);

		await strategy.loadMocDataAsync("MOC.md");
		strategy.clearCache();
		await strategy.loadMocDataAsync("MOC.md");

		expect((app.vault.cachedRead as any).mock.calls).toHaveLength(2);
	});
});

describe("MocContentStrategy.buildTree", () => {
	it("returns a no-children stub when no mocFilePath is supplied", () => {
		const { strategy } = buildStrategy([{ path: "Note.md", frontmatter: {} }]);

		const tree = strategy.buildTree(tfileFor("Note.md"));

		expect(tree.path).toBe("Note.md");
		expect(tree.children).toEqual([]);
		expect(tree.isCurrentFile).toBe(true);
	});

	it("returns the full MOC tree when start file is the MOC itself", async () => {
		const { strategy } = buildStrategy([
			{ path: "MOC.md", content: MOC_CONTENT },
			{ path: "Project A.md", frontmatter: {} },
			{ path: "Project B.md", frontmatter: {} },
		]);
		await strategy.loadMocDataAsync("MOC.md");

		const tree = strategy.buildTree(tfileFor("MOC.md"), { mocFilePath: "MOC.md" });

		expect(tree.children).toHaveLength(2);
		expect(tree.children[0].name).toBe("Project A");
	});
});

describe("MocContentStrategy.findChildren / findParents (no MOC)", () => {
	it("returns empty arrays when mocFilePath is undefined", () => {
		const { strategy } = buildStrategy([]);

		expect(strategy.findChildren("Note.md")).toEqual([]);
		expect(strategy.findParents("Note.md")).toEqual([]);
	});
});
