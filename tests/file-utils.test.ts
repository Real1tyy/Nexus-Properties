import { describe, expect, it, vi } from "vitest";
import { getUniqueParentFilePath } from "../src/utils/file-utils";

describe("getUniqueParentFilePath", () => {
	describe("no folder path", () => {
		it("should return base path when no file exists", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "Child");

			expect(result).toBe(" - Child.md");
			expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith(" - Child.md");
		});

		it("should return numbered path when base path exists", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) => {
						// Base path exists, but "1 - Child.md" doesn't
						if (path === " - Child.md") return { path };
						return null;
					}),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "Child");

			expect(result).toBe("1 - Child.md");
		});

		it("should increment until unique path is found", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) => {
						// Base, 1, 2, and 3 exist, but 4 doesn't
						if (
							path === " - Child.md" ||
							path === "1 - Child.md" ||
							path === "2 - Child.md" ||
							path === "3 - Child.md"
						) {
							return { path };
						}
						return null;
					}),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "Child");

			expect(result).toBe("4 - Child.md");
		});
	});

	describe("with folder path", () => {
		it("should return base path in folder when no file exists", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "Projects", "Task");

			expect(result).toBe("Projects/ - Task.md");
			expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith("Projects/ - Task.md");
		});

		it("should return numbered path in folder when base path exists", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) => {
						if (path === "Projects/ - Task.md") return { path };
						return null;
					}),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "Projects", "Task");

			expect(result).toBe("Projects/1 - Task.md");
		});

		it("should increment with folder path until unique", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) => {
						if (path === "Projects/ - Task.md" || path === "Projects/1 - Task.md") {
							return { path };
						}
						return null;
					}),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "Projects", "Task");

			expect(result).toBe("Projects/2 - Task.md");
		});

		it("should handle nested folder paths", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "Work/Projects/Active", "Feature");

			expect(result).toBe("Work/Projects/Active/ - Feature.md");
		});
	});

	describe("edge cases", () => {
		it("should handle source basename with special characters", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "Task (Important)");

			expect(result).toBe(" - Task (Important).md");
		});

		it("should handle source basename with spaces", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "My Complex Task Name");

			expect(result).toBe(" - My Complex Task Name.md");
		});

		it("should handle empty string folder as root", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn().mockReturnValue(null),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "Root Task");

			expect(result).toBe(" - Root Task.md");
		});

		it("should place numbers before dash consistently", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) => {
						if (path === "folder/ - Note.md") return { path };
						return null;
					}),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "folder", "Note");

			// Number should be before dash, not after
			expect(result).toBe("folder/1 - Note.md");
			expect(result).not.toBe("folder/ - Note 1.md");
		});
	});

	describe("high increment scenarios", () => {
		it("should handle double-digit increments", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) => {
						// Simulate 15 existing files
						if (path === " - Task.md") return { path };
						for (let i = 1; i <= 14; i++) {
							if (path === `${i} - Task.md`) return { path };
						}
						return null;
					}),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "Task");

			expect(result).toBe("15 - Task.md");
		});

		it("should handle triple-digit increments", () => {
			const mockApp = {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) => {
						if (path === " - Item.md") return { path };
						for (let i = 1; i <= 123; i++) {
							if (path === `${i} - Item.md`) return { path };
						}
						return null;
					}),
				},
			} as any;

			const result = getUniqueParentFilePath(mockApp, "", "Item");

			expect(result).toBe("124 - Item.md");
		});
	});
});
