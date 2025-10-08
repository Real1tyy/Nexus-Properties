import { describe, expect, it } from "vitest";
import { formatWikiLink, parsePropertyLinks, parseWikiLink } from "../src/utils/link-parser";

describe("parseWikiLink", () => {
	it("should parse simple wiki link", () => {
		expect(parseWikiLink("[[Projects/My Project]]")).toBe("Projects/My Project");
	});

	it("should parse wiki link with display name", () => {
		expect(parseWikiLink("[[Projects/My Project|My Project]]")).toBe("Projects/My Project");
	});

	it("should handle links with spaces", () => {
		expect(parseWikiLink("[[Projects/Some Project Name]]")).toBe("Projects/Some Project Name");
	});

	it("should return null for invalid formats", () => {
		expect(parseWikiLink("not a link")).toBeNull();
		expect(parseWikiLink("[[incomplete")).toBeNull();
		expect(parseWikiLink("incomplete]]")).toBeNull();
		expect(parseWikiLink("")).toBeNull();
	});

	it("should handle trimming whitespace", () => {
		expect(parseWikiLink("  [[Projects/My Project]]  ")).toBe("Projects/My Project");
	});
});

describe("parsePropertyLinks", () => {
	it("should parse single link string", () => {
		expect(parsePropertyLinks("[[Projects/My Project]]")).toEqual(["Projects/My Project"]);
	});

	it("should parse array of links", () => {
		const links = ["[[Projects/Project A]]", "[[Projects/Project B|Project B]]", "[[Projects/Project C]]"];
		expect(parsePropertyLinks(links)).toEqual(["Projects/Project A", "Projects/Project B", "Projects/Project C"]);
	});

	it("should filter out invalid links", () => {
		const links = ["[[Projects/Valid]]", "invalid", "[[Projects/Another Valid]]"];
		expect(parsePropertyLinks(links)).toEqual(["Projects/Valid", "Projects/Another Valid"]);
	});

	it("should return empty array for undefined", () => {
		expect(parsePropertyLinks(undefined)).toEqual([]);
	});

	it("should return empty array for empty string", () => {
		expect(parsePropertyLinks("")).toEqual([]);
	});

	it("should return empty array for empty array", () => {
		expect(parsePropertyLinks([])).toEqual([]);
	});
});

describe("formatWikiLink", () => {
	it("should format nested path with display name alias", () => {
		expect(formatWikiLink("Projects/MyProject")).toBe("[[Projects/MyProject|MyProject]]");
	});

	it("should format path with spaces and display name", () => {
		expect(formatWikiLink("Projects/My Project")).toBe("[[Projects/My Project|My Project]]");
	});

	it("should format deeply nested path", () => {
		expect(formatWikiLink("Projects/Subproject/MyFile")).toBe("[[Projects/Subproject/MyFile|MyFile]]");
	});

	it("should handle simple filename without path", () => {
		expect(formatWikiLink("MyProject")).toBe("[[MyProject]]");
	});

	it("should handle filename with extension", () => {
		expect(formatWikiLink("Projects/document.md")).toBe("[[Projects/document.md|document.md]]");
	});

	it("should handle paths with multiple spaces", () => {
		expect(formatWikiLink("My Folder/My Sub Folder/My File")).toBe("[[My Folder/My Sub Folder/My File|My File]]");
	});

	it("should trim whitespace from input", () => {
		expect(formatWikiLink("  Projects/MyProject  ")).toBe("[[Projects/MyProject|MyProject]]");
	});

	it("should return empty string for empty input", () => {
		expect(formatWikiLink("")).toBe("");
	});

	it("should return empty string for whitespace only", () => {
		expect(formatWikiLink("   ")).toBe("");
	});

	it("should handle paths with special characters", () => {
		expect(formatWikiLink("Projects/My-Project_v2")).toBe("[[Projects/My-Project_v2|My-Project_v2]]");
	});

	it("should handle paths with numbers", () => {
		expect(formatWikiLink("2024/Projects/Project123")).toBe("[[2024/Projects/Project123|Project123]]");
	});

	it("should handle paths with dots", () => {
		expect(formatWikiLink("Projects/My.Project.Name")).toBe("[[Projects/My.Project.Name|My.Project.Name]]");
	});
});
