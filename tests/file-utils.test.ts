import { describe, expect, it, vi } from "vitest";
import { getUniqueFilePath } from "../src/utils/file";

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
							const counter = Number.parseInt(match[1]);
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
