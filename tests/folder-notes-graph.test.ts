import type { App } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { GraphBuilder } from "../src/core/graph-builder";
import type { Indexer } from "../src/core/indexer";
import type { SettingsStore } from "../src/core/settings-store";

describe("Folder Notes Graph Building", () => {
	const createMockApp = (files: { path: string; frontmatter?: Record<string, any> }[]): App => {
		const fileMap = new Map(files.map((f) => [f.path, f]));

		return {
			vault: {
				getMarkdownFiles: vi.fn(() =>
					files.map((f) => ({
						path: f.path,
						basename: f.path.split("/").pop()?.replace(".md", "") || "",
					}))
				),
				getAbstractFileByPath: vi.fn((path) => {
					const file = fileMap.get(path);
					return file ? { path } : null;
				}),
				getFileByPath: vi.fn((path) => {
					const file = fileMap.get(path);
					return file ? { path } : null;
				}),
			},
			metadataCache: {
				getFileCache: vi.fn((file) => {
					const fileData = fileMap.get(file.path);
					return fileData?.frontmatter ? { frontmatter: fileData.frontmatter } : null;
				}),
			},
		} as any;
	};

	const createMockIndexer = (customExtractor?: any): Indexer => {
		return {
			extractRelationships: customExtractor || vi.fn(),
		} as any;
	};

	const createMockSettingsStore = (): SettingsStore => {
		return {
			settings$: {
				value: {
					hierarchyMaxDepth: 10,
					filterExpressions: [],
					colorRules: [],
					defaultNodeColor: "#e9f2ff",
				},
				subscribe: vi.fn(),
			},
		} as any;
	};

	describe("Single Tree (frontmatter-based)", () => {
		it("should build tree from frontmatter Parent/Child relationships", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} }, // Folder note (excluded)
				{ path: "tasks/task1.md", frontmatter: {} }, // Root (no Parent)
				{ path: "tasks/task2.md", frontmatter: { Parent: "[[tasks/task1.md]]" } }, // Child of task1
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer((file: any, fm: any) => {
				const parent = fm.Parent ? [fm.Parent] : [];
				const children: string[] = [];

				if (file.path === "tasks/task1.md") {
					children.push("[[tasks/task2.md]]");
				}

				return {
					filePath: file.path,
					mtime: 0,
					parent,
					children,
					related: [],
					frontmatter: fm,
				};
			});
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			const nodeIds = result.nodes.map((n) => n.data?.id);

			// Should not include folder note
			expect(nodeIds).not.toContain("tasks/tasks.md");

			// Should include all files with frontmatter
			expect(nodeIds).toContain("tasks/task1.md");
			expect(nodeIds).toContain("tasks/task2.md");

			// Should have edge based on Parent/Child
			expect(result.edges).toHaveLength(1);
			expect(result.edges[0].data).toEqual({
				source: "tasks/task1.md",
				target: "tasks/task2.md",
			});
		});

		it("should handle deep hierarchy from frontmatter", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} }, // Folder note
				{ path: "tasks/task1.md", frontmatter: {} }, // Root
				{ path: "tasks/task2.md", frontmatter: { Parent: "[[tasks/task1.md]]" } },
				{ path: "tasks/task3.md", frontmatter: { Parent: "[[tasks/task2.md]]" } },
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer((file: any, fm: any) => {
				const parent = fm.Parent ? [fm.Parent] : [];
				const children: string[] = [];

				if (file.path === "tasks/task1.md") children.push("[[tasks/task2.md]]");
				if (file.path === "tasks/task2.md") children.push("[[tasks/task3.md]]");

				return {
					filePath: file.path,
					mtime: 0,
					parent,
					children,
					related: [],
					frontmatter: fm,
				};
			});
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			const nodeIds = result.nodes.map((n) => n.data?.id);
			expect(nodeIds).toContain("tasks/task1.md");
			expect(nodeIds).toContain("tasks/task2.md");
			expect(nodeIds).toContain("tasks/task3.md");
			expect(result.edges).toHaveLength(2);
		});
	});

	describe("Forest (multiple trees from frontmatter)", () => {
		it("should build forest with multiple independent trees", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} }, // Folder note
				// Tree 1
				{ path: "tasks/task1.md", frontmatter: {} }, // Root 1
				{ path: "tasks/task2.md", frontmatter: { Parent: "[[tasks/task1.md]]" } },
				// Tree 2
				{ path: "tasks/task3.md", frontmatter: {} }, // Root 2
				{ path: "tasks/task4.md", frontmatter: { Parent: "[[tasks/task3.md]]" } },
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer((file: any, fm: any) => {
				const parent = fm.Parent ? [fm.Parent] : [];
				const children: string[] = [];

				if (file.path === "tasks/task1.md") children.push("[[tasks/task2.md]]");
				if (file.path === "tasks/task3.md") children.push("[[tasks/task4.md]]");

				return {
					filePath: file.path,
					mtime: 0,
					parent,
					children,
					related: [],
					frontmatter: fm,
				};
			});
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			const nodeIds = result.nodes.map((n) => n.data?.id);

			// Should have all nodes from both trees
			expect(nodeIds).toContain("tasks/task1.md");
			expect(nodeIds).toContain("tasks/task2.md");
			expect(nodeIds).toContain("tasks/task3.md");
			expect(nodeIds).toContain("tasks/task4.md");

			// Should not include folder note
			expect(nodeIds).not.toContain("tasks/tasks.md");

			// Should have 2 edges (one per tree)
			expect(result.edges).toHaveLength(2);
		});

		it("should handle forest with different tree depths", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} },
				// Tree 1: Single node
				{ path: "tasks/task1.md", frontmatter: {} },
				// Tree 2: Two levels
				{ path: "tasks/task2.md", frontmatter: {} },
				{ path: "tasks/task3.md", frontmatter: { Parent: "[[tasks/task2.md]]" } },
				// Tree 3: Three levels
				{ path: "tasks/task4.md", frontmatter: {} },
				{ path: "tasks/task5.md", frontmatter: { Parent: "[[tasks/task4.md]]" } },
				{ path: "tasks/task6.md", frontmatter: { Parent: "[[tasks/task5.md]]" } },
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer((file: any, fm: any) => {
				const parent = fm.Parent ? [fm.Parent] : [];
				const children: string[] = [];

				if (file.path === "tasks/task2.md") children.push("[[tasks/task3.md]]");
				if (file.path === "tasks/task4.md") children.push("[[tasks/task5.md]]");
				if (file.path === "tasks/task5.md") children.push("[[tasks/task6.md]]");

				return {
					filePath: file.path,
					mtime: 0,
					parent,
					children,
					related: [],
					frontmatter: fm,
				};
			});
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			expect(result.nodes).toHaveLength(6);
			expect(result.edges).toHaveLength(3); // 0 + 1 + 2 edges
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty folder (only folder note)", () => {
			const files = [{ path: "tasks/tasks.md", frontmatter: {} }];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer();
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
		});

		it("should skip files without frontmatter", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} }, // Folder note
				{ path: "tasks/task1.md", frontmatter: {} }, // Has frontmatter
				{ path: "tasks/task2.md" }, // No frontmatter
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer(() => ({
				filePath: "",
				mtime: 0,
				parent: [],
				children: [],
				related: [],
				frontmatter: {},
			}));
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			const nodeIds = result.nodes.map((n) => n.data?.id);
			expect(nodeIds).toContain("tasks/task1.md");
			expect(nodeIds).not.toContain("tasks/task2.md"); // No frontmatter
		});

		it("should respect hierarchy max depth", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} },
				{ path: "tasks/task1.md", frontmatter: {} },
				{ path: "tasks/task2.md", frontmatter: { Parent: "[[tasks/task1.md]]" } },
				{ path: "tasks/task3.md", frontmatter: { Parent: "[[tasks/task2.md]]" } },
				{ path: "tasks/task4.md", frontmatter: { Parent: "[[tasks/task3.md]]" } },
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer((file: any, fm: any) => {
				const parent = fm.Parent ? [fm.Parent] : [];
				const children: string[] = [];

				if (file.path === "tasks/task1.md") children.push("[[tasks/task2.md]]");
				if (file.path === "tasks/task2.md") children.push("[[tasks/task3.md]]");
				if (file.path === "tasks/task3.md") children.push("[[tasks/task4.md]]");

				return {
					filePath: file.path,
					mtime: 0,
					parent,
					children,
					related: [],
					frontmatter: fm,
				};
			});
			const mockSettingsStore = createMockSettingsStore();
			mockSettingsStore.settings$.value.hierarchyMaxDepth = 2;

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			const nodeIds = result.nodes.map((n) => n.data?.id);

			// Should include levels 0-1 only (stops at currentLevel >= 2)
			expect(nodeIds).toContain("tasks/task1.md"); // Level 0
			expect(nodeIds).toContain("tasks/task2.md"); // Level 1
			expect(nodeIds).not.toContain("tasks/task3.md"); // Level 2+
			expect(nodeIds).not.toContain("tasks/task4.md"); // Level 3+
		});

		it("should avoid duplicate nodes when processing multiple files", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} },
				{ path: "tasks/task1.md", frontmatter: {} }, // Root
				{ path: "tasks/task2.md", frontmatter: { Parent: "[[tasks/task1.md]]" } },
				{ path: "tasks/task3.md", frontmatter: { Parent: "[[tasks/task1.md]]" } }, // Another child of task1
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer((file: any, fm: any) => {
				const parent = fm.Parent ? [fm.Parent] : [];
				const children: string[] = [];

				if (file.path === "tasks/task1.md") {
					children.push("[[tasks/task2.md]]", "[[tasks/task3.md]]");
				}

				return {
					filePath: file.path,
					mtime: 0,
					parent,
					children,
					related: [],
					frontmatter: fm,
				};
			});
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			const nodeIds = result.nodes.map((n) => n.data?.id);

			// Check no duplicate nodes
			const uniqueIds = new Set(nodeIds);
			expect(uniqueIds.size).toBe(nodeIds.length);

			// Should have all nodes
			expect(nodeIds).toContain("tasks/task1.md");
			expect(nodeIds).toContain("tasks/task2.md");
			expect(nodeIds).toContain("tasks/task3.md");
		});
	});

	describe("Level Assignment", () => {
		it("should assign correct levels based on frontmatter hierarchy", () => {
			const files = [
				{ path: "tasks/tasks.md", frontmatter: {} },
				{ path: "tasks/task1.md", frontmatter: {} }, // Root (level 0)
				{ path: "tasks/task2.md", frontmatter: { Parent: "[[tasks/task1.md]]" } }, // Level 1
				{ path: "tasks/task3.md", frontmatter: { Parent: "[[tasks/task2.md]]" } }, // Level 2
			];

			const mockApp = createMockApp(files);
			const mockIndexer = createMockIndexer((file: any, fm: any) => {
				const parent = fm.Parent ? [fm.Parent] : [];
				const children: string[] = [];

				if (file.path === "tasks/task1.md") children.push("[[tasks/task2.md]]");
				if (file.path === "tasks/task2.md") children.push("[[tasks/task3.md]]");

				return {
					filePath: file.path,
					mtime: 0,
					parent,
					children,
					related: [],
					frontmatter: fm,
				};
			});
			const mockSettingsStore = createMockSettingsStore();

			const graphBuilder = new GraphBuilder(mockApp, mockIndexer, mockSettingsStore);
			const result = graphBuilder.buildGraph({
				sourcePath: "tasks/tasks.md",
				renderRelated: false,
				includeAllRelated: false,
				startFromCurrent: false,
			});

			const task1 = result.nodes.find((n) => n.data?.id === "tasks/task1.md");
			const task2 = result.nodes.find((n) => n.data?.id === "tasks/task2.md");
			const task3 = result.nodes.find((n) => n.data?.id === "tasks/task3.md");

			expect(task1?.data?.level).toBe(0);
			expect(task2?.data?.level).toBe(1);
			expect(task3?.data?.level).toBe(2);
		});
	});
});
