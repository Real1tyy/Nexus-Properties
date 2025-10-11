import { describe, expect, it } from "vitest";
import { extractDisplayName, extractFilePath } from "../src/utils/file-name-extractor";

describe("extractDisplayName", () => {
	describe("Wiki links with aliases", () => {
		it("should extract alias from wiki link with pipe", () => {
			expect(extractDisplayName("[[Projects/A|A]]")).toBe("A");
		});

		it("should extract alias from wiki link with path and alias", () => {
			expect(extractDisplayName("[[Projects/B|B]]")).toBe("B");
		});

		it("should extract alias with spaces", () => {
			expect(extractDisplayName("[[path/to/file|My Alias]]")).toBe("My Alias");
		});

		it("should handle alias with special characters", () => {
			expect(extractDisplayName("[[path/file|Alias: Test]]")).toBe("Alias: Test");
		});

		it("should trim whitespace from alias", () => {
			expect(extractDisplayName("[[path/file| My Alias ]]")).toBe("My Alias");
		});
	});

	describe("Wiki links without aliases", () => {
		it("should extract filename from simple wiki link", () => {
			expect(extractDisplayName("[[MyFile]]")).toBe("MyFile");
		});

		it("should extract filename from wiki link with path", () => {
			expect(extractDisplayName("[[Projects/A]]")).toBe("A");
		});

		it("should extract filename from wiki link with nested path", () => {
			expect(extractDisplayName("[[Projects/SubFolder/File]]")).toBe("File");
		});

		it("should remove .md extension from wiki link", () => {
			expect(extractDisplayName("[[Projects/A.md]]")).toBe("A");
		});

		it("should handle wiki link with only filename and .md", () => {
			expect(extractDisplayName("[[MyFile.md]]")).toBe("MyFile");
		});
	});

	describe("Regular file paths", () => {
		it("should extract filename from path with .md", () => {
			expect(extractDisplayName("Projects/A.md")).toBe("A");
		});

		it("should extract filename from path without .md", () => {
			expect(extractDisplayName("Projects/B")).toBe("B");
		});

		it("should extract filename from nested path", () => {
			expect(extractDisplayName("Projects/SubFolder/File.md")).toBe("File");
		});

		it("should handle filename without path", () => {
			expect(extractDisplayName("MyFile.md")).toBe("MyFile");
		});

		it("should handle filename without path or extension", () => {
			expect(extractDisplayName("MyFile")).toBe("MyFile");
		});

		it("should handle case-insensitive .md extension", () => {
			expect(extractDisplayName("MyFile.MD")).toBe("MyFile");
			expect(extractDisplayName("MyFile.Md")).toBe("MyFile");
		});
	});

	describe("Edge cases", () => {
		it("should handle empty string", () => {
			expect(extractDisplayName("")).toBe("");
		});

		it("should handle whitespace-only string", () => {
			expect(extractDisplayName("   ")).toBe("");
		});

		it("should handle wiki link with empty content", () => {
			expect(extractDisplayName("[[]]")).toBe("[[]]");
		});

		it("should handle wiki link with only pipe", () => {
			expect(extractDisplayName("[[|]]")).toBe("");
		});

		it("should handle wiki link with path but empty alias", () => {
			expect(extractDisplayName("[[Projects/A|]]")).toBe("");
		});

		it("should trim surrounding whitespace", () => {
			expect(extractDisplayName("  [[Projects/A|A]]  ")).toBe("A");
		});

		it("should handle multiple slashes in path", () => {
			expect(extractDisplayName("Projects/Sub/Folder/File.md")).toBe("File");
		});

		it("should handle file with dots in name", () => {
			expect(extractDisplayName("My.Special.File.md")).toBe("My.Special.File");
		});
	});
});

describe("extractFilePath", () => {
	describe("Wiki links with aliases", () => {
		it("should extract path from wiki link with alias", () => {
			expect(extractFilePath("[[Projects/A|A]]")).toBe("Projects/A.md");
		});

		it("should extract path and add .md if missing", () => {
			expect(extractFilePath("[[Projects/B|My Alias]]")).toBe("Projects/B.md");
		});

		it("should preserve .md if already present", () => {
			expect(extractFilePath("[[Projects/A.md|A]]")).toBe("Projects/A.md");
		});
	});

	describe("Wiki links without aliases", () => {
		it("should extract path from simple wiki link", () => {
			expect(extractFilePath("[[MyFile]]")).toBe("MyFile.md");
		});

		it("should extract path from wiki link with path", () => {
			expect(extractFilePath("[[Projects/A]]")).toBe("Projects/A.md");
		});

		it("should add .md if missing from wiki link", () => {
			expect(extractFilePath("[[Projects/SubFolder/File]]")).toBe("Projects/SubFolder/File.md");
		});

		it("should preserve .md if present in wiki link", () => {
			expect(extractFilePath("[[Projects/A.md]]")).toBe("Projects/A.md");
		});
	});

	describe("Regular file paths", () => {
		it("should preserve path with .md", () => {
			expect(extractFilePath("Projects/A.md")).toBe("Projects/A.md");
		});

		it("should add .md if missing", () => {
			expect(extractFilePath("Projects/B")).toBe("Projects/B.md");
		});

		it("should handle nested paths", () => {
			expect(extractFilePath("Projects/SubFolder/File")).toBe("Projects/SubFolder/File.md");
		});

		it("should handle simple filename", () => {
			expect(extractFilePath("MyFile")).toBe("MyFile.md");
		});
	});

	describe("Edge cases", () => {
		it("should handle empty string", () => {
			expect(extractFilePath("")).toBe("");
		});

		it("should handle whitespace-only string", () => {
			expect(extractFilePath("   ")).toBe(".md");
		});

		it("should trim surrounding whitespace", () => {
			expect(extractFilePath("  [[Projects/A]]  ")).toBe("Projects/A.md");
		});

		it("should handle wiki link with empty content", () => {
			expect(extractFilePath("[[]]")).toBe("[[]].md");
		});

		it("should handle path with whitespace", () => {
			expect(extractFilePath("[[Projects/A|My Alias]]")).toBe("Projects/A.md");
		});
	});
});
