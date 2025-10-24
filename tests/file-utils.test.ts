import { describe, expect, it, vi } from "vitest";
import {
	findRootNodesInFolder,
	getChildrenByFolder,
	getFolderPath,
	getParentByFolder,
	getUniqueFilePath,
	isFolderNote,
} from "../src/utils/file";

describe("getUniqueFilePath", () => {
	describe("basic functionality", () => {
		it("should return base name with .md extension when file doesn't exist", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "MyNote");

			expect(result).toBe("MyNote.md");
			expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith("MyNote.md");
		});

		it("should append counter when file exists", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi
						.fn()
						.mockReturnValueOnce({ path: "MyNote.md" }) // First check: file exists
						.mockReturnValueOnce(null), // Second check: MyNote 1.md doesn't exist
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "MyNote");

			expect(result).toBe("MyNote 1.md");
			expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith("MyNote.md");
			expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith("MyNote 1.md");
		});

		it("should increment counter until finding unique name", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi
						.fn()
						.mockReturnValueOnce({ path: "MyNote.md" }) // MyNote.md exists
						.mockReturnValueOnce({ path: "MyNote 1.md" }) // MyNote 1.md exists
						.mockReturnValueOnce({ path: "MyNote 2.md" }) // MyNote 2.md exists
						.mockReturnValueOnce(null), // MyNote 3.md doesn't exist
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "MyNote");

			expect(result).toBe("MyNote 3.md");
		});
	});

	describe("folder handling", () => {
		it("should handle folder paths correctly", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "Projects", "Task");

			expect(result).toBe("Projects/Task.md");
			expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith("Projects/Task.md");
		});

		it("should handle nested folder paths", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "Projects/Work/Active", "Task");

			expect(result).toBe("Projects/Work/Active/Task.md");
		});

		it("should handle root folder (empty string)", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "Note");

			expect(result).toBe("Note.md");
		});

		it("should handle root folder (slash)", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "/", "Note");

			expect(result).toBe("Note.md");
		});

		it("should append counter in folder when file exists", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValueOnce({ path: "Projects/Task.md" }).mockReturnValueOnce(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "Projects", "Task");

			expect(result).toBe("Projects/Task 1.md");
		});
	});

	describe("edge cases", () => {
		it("should handle base names with spaces", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "My Long Note Name");

			expect(result).toBe("My Long Note Name.md");
		});

		it("should handle base names with special characters", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "Note (Draft)");

			expect(result).toBe("Note (Draft).md");
		});

		it("should handle base names with numbers", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValueOnce({ path: "Task 123.md" }).mockReturnValueOnce(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "Task 123");

			expect(result).toBe("Task 123 1.md");
		});

		it("should handle high counter values", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path) => {
						// Return existing file for counters 0-99, null for 100
						if (path === "Note.md") return { path };
						const match = path.match(/Note (\d+)\.md/);
						if (match) {
							const counter = Number.parseInt(match[1], 10);
							return counter < 100 ? { path } : null;
						}
						return null;
					}),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "", "Note");

			expect(result).toBe("Note 100.md");
		});
	});

	describe("real-world scenarios", () => {
		it("should handle creating child node from parent", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "Notes", "Prisma Child");

			expect(result).toBe("Notes/Prisma Child.md");
		});

		it("should handle multiple child nodes from same parent", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi
						.fn()
						.mockReturnValueOnce({ path: "Notes/Prisma Child.md" })
						.mockReturnValueOnce({ path: "Notes/Prisma Child 1.md" })
						.mockReturnValueOnce(null),
				},
			} as any;

			const result = getUniqueFilePath(mockApp, "Notes", "Prisma Child");

			expect(result).toBe("Notes/Prisma Child 2.md");
		});
	});
});

describe("isFolderNote", () => {
	describe("folder note detection", () => {
		it("should return true for folder note (folder/folder.md)", () => {
			expect(isFolderNote("tasks/tasks.md")).toBe(true);
		});

		it("should return true for nested folder note", () => {
			expect(isFolderNote("projects/docs/docs.md")).toBe(true);
		});

		it("should return true for deeply nested folder note", () => {
			expect(isFolderNote("a/b/c/d/d.md")).toBe(true);
		});

		it("should return false for non-folder note", () => {
			expect(isFolderNote("tasks/subtask.md")).toBe(false);
		});

		it("should return false for root level file", () => {
			expect(isFolderNote("note.md")).toBe(false);
		});

		it("should return false for empty path", () => {
			expect(isFolderNote("")).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle path without extension", () => {
			expect(isFolderNote("tasks/tasks")).toBe(true);
		});

		it("should handle case-sensitive folder names", () => {
			expect(isFolderNote("Tasks/tasks.md")).toBe(false);
			expect(isFolderNote("Tasks/Tasks.md")).toBe(true);
		});
	});
});

describe("getFolderPath", () => {
	describe("basic functionality", () => {
		it("should extract folder path from file path", () => {
			expect(getFolderPath("tasks/subtask.md")).toBe("tasks");
		});

		it("should extract nested folder path", () => {
			expect(getFolderPath("projects/docs/notes.md")).toBe("projects/docs");
		});

		it("should return empty string for root level file", () => {
			expect(getFolderPath("note.md")).toBe("");
		});

		it("should return empty string for empty path", () => {
			expect(getFolderPath("")).toBe("");
		});
	});

	describe("edge cases", () => {
		it("should handle paths with multiple slashes", () => {
			expect(getFolderPath("a/b/c/d/file.md")).toBe("a/b/c/d");
		});

		it("should handle paths without extension", () => {
			expect(getFolderPath("folder/file")).toBe("folder");
		});
	});
});

describe("getParentByFolder", () => {
	describe("basic functionality", () => {
		it("should return parent folder note if it exists", () => {
			const mockApp = {
				vault: {
					getFileByPath: vi.fn((path) => {
						return path === "tasks/tasks.md" ? { path: "tasks/tasks.md" } : null;
					}),
				},
			} as any;

			expect(getParentByFolder(mockApp, "tasks/subtask.md")).toBe("tasks/tasks.md");
		});

		it("should return null if parent folder note doesn't exist", () => {
			const mockApp = {
				vault: {
					getFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			expect(getParentByFolder(mockApp, "tasks/subtask.md")).toBe(null);
		});

		it("should return null for root level file", () => {
			const mockApp = {
				vault: {
					getFileByPath: vi.fn(),
				},
			} as any;

			expect(getParentByFolder(mockApp, "note.md")).toBe(null);
		});
	});

	describe("nested folders", () => {
		it("should find parent in nested folder structure", () => {
			const mockApp = {
				vault: {
					getFileByPath: vi.fn((path) => {
						return path === "projects/docs/docs.md" ? { path: "projects/docs/docs.md" } : null;
					}),
				},
			} as any;

			expect(getParentByFolder(mockApp, "projects/docs/readme.md")).toBe("projects/docs/docs.md");
		});

		it("should return null if nested parent doesn't exist", () => {
			const mockApp = {
				vault: {
					getFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			expect(getParentByFolder(mockApp, "projects/docs/readme.md")).toBe(null);
		});
	});
});

describe("getChildrenByFolder", () => {
	describe("folder note children", () => {
		it("should return children of folder note", () => {
			const mockFiles = [
				{ path: "tasks/tasks.md" },
				{ path: "tasks/task1.md" },
				{ path: "tasks/task2.md" },
				{ path: "tasks/subtasks/subtask1.md" },
			];

			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => mockFiles),
				},
			} as any;

			const children = getChildrenByFolder(mockApp, "tasks/tasks.md");
			expect(children).toContain("tasks/task1.md");
			expect(children).toContain("tasks/task2.md");
			expect(children).not.toContain("tasks/tasks.md"); // Exclude self
			expect(children).not.toContain("tasks/subtasks/subtask1.md"); // Exclude files in subfolders
		});

		it("should include subfolder notes as children", () => {
			const mockFiles = [
				{ path: "tasks/tasks.md" },
				{ path: "tasks/task1.md" },
				{ path: "tasks/subtasks/subtasks.md" },
				{ path: "tasks/subtasks/subtask1.md" },
			];

			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => mockFiles),
				},
			} as any;

			const children = getChildrenByFolder(mockApp, "tasks/tasks.md");
			expect(children).toContain("tasks/task1.md");
			expect(children).toContain("tasks/subtasks/subtasks.md"); // Include subfolder note
			expect(children).not.toContain("tasks/subtasks/subtask1.md"); // Exclude files inside subfolder
		});

		it("should return empty array if folder is empty", () => {
			const mockFiles = [{ path: "tasks/tasks.md" }];

			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => mockFiles),
				},
			} as any;

			const children = getChildrenByFolder(mockApp, "tasks/tasks.md");
			expect(children).toEqual([]);
		});
	});

	describe("regular file children", () => {
		it("should return matching subfolder note for regular file", () => {
			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => []),
					getFileByPath: vi.fn((path) => {
						return path === "tasks/task1/task1.md" ? { path: "tasks/task1/task1.md" } : null;
					}),
				},
			} as any;

			const children = getChildrenByFolder(mockApp, "tasks/task1.md");
			expect(children).toContain("tasks/task1/task1.md");
		});

		it("should return empty array if no matching subfolder note exists", () => {
			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => []),
					getFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const children = getChildrenByFolder(mockApp, "tasks/task1.md");
			expect(children).toEqual([]);
		});
	});
});

describe("findRootNodesInFolder", () => {
	describe("root node identification", () => {
		it("should find all files at the top level of folder", () => {
			const mockFiles = [
				{ path: "tasks/tasks.md" },
				{ path: "tasks/task1.md" },
				{ path: "tasks/task2.md" },
				{ path: "tasks/subtasks/subtasks.md" },
				{ path: "tasks/subtasks/subtask1.md" },
			];

			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => mockFiles),
				},
			} as any;

			const roots = findRootNodesInFolder(mockApp, "tasks");
			expect(roots).toHaveLength(3);
			expect(roots).toContain("tasks/tasks.md");
			expect(roots).toContain("tasks/task1.md");
			expect(roots).toContain("tasks/task2.md");
			expect(roots).not.toContain("tasks/subtasks/subtasks.md");
			expect(roots).not.toContain("tasks/subtasks/subtask1.md");
		});

		it("should return empty array if folder has no files", () => {
			const mockFiles = [{ path: "other/file.md" }, { path: "tasks/subfolder/file.md" }];

			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => mockFiles),
				},
			} as any;

			const roots = findRootNodesInFolder(mockApp, "tasks");
			expect(roots).toEqual([]);
		});

		it("should handle empty vault", () => {
			const mockApp = {
				vault: {
					getMarkdownFiles: vi.fn(() => []),
				},
			} as any;

			const roots = findRootNodesInFolder(mockApp, "tasks");
			expect(roots).toEqual([]);
		});
	});
});
