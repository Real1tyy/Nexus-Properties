import { describe, expect, it } from "vitest";
import { formatValue, parseValue, parseWikiLink, serializeValue } from "../src/utils/frontmatter-value-utils";

describe("serializeValue", () => {
	it("should return empty string for null", () => {
		expect(serializeValue(null)).toBe("");
	});

	it("should return empty string for undefined", () => {
		expect(serializeValue(undefined)).toBe("");
	});

	it("should serialize string values", () => {
		expect(serializeValue("hello")).toBe("hello");
	});

	it("should serialize number values", () => {
		expect(serializeValue(42)).toBe("42");
		expect(serializeValue(3.14)).toBe("3.14");
	});

	it("should serialize boolean values", () => {
		expect(serializeValue(true)).toBe("true");
		expect(serializeValue(false)).toBe("false");
	});

	it("should serialize arrays with comma separation", () => {
		expect(serializeValue(["tag1", "tag2", "tag3"])).toBe("tag1, tag2, tag3");
	});

	it("should serialize nested arrays", () => {
		expect(serializeValue([1, 2, 3])).toBe("1, 2, 3");
	});

	it("should serialize objects as JSON", () => {
		const obj = { key: "value", nested: { prop: 123 } };
		expect(serializeValue(obj)).toBe(JSON.stringify(obj));
	});

	it("should handle mixed array types", () => {
		expect(serializeValue(["text", 123, true])).toBe("text, 123, true");
	});
});

describe("parseValue", () => {
	it("should return empty string for empty input", () => {
		expect(parseValue("")).toBe("");
		expect(parseValue("   ")).toBe("");
	});

	it("should parse boolean true", () => {
		expect(parseValue("true")).toBe(true);
		expect(parseValue("True")).toBe(true);
		expect(parseValue("TRUE")).toBe(true);
	});

	it("should parse boolean false", () => {
		expect(parseValue("false")).toBe(false);
		expect(parseValue("False")).toBe(false);
		expect(parseValue("FALSE")).toBe(false);
	});

	it("should parse positive integers", () => {
		expect(parseValue("42")).toBe(42);
		expect(parseValue("0")).toBe(0);
	});

	it("should parse negative integers", () => {
		expect(parseValue("-42")).toBe(-42);
	});

	it("should parse decimal numbers", () => {
		expect(parseValue("3.14")).toBe(3.14);
		expect(parseValue("-2.5")).toBe(-2.5);
	});

	it("should parse comma-separated arrays", () => {
		expect(parseValue("tag1, tag2, tag3")).toEqual(["tag1", "tag2", "tag3"]);
	});

	it("should handle arrays with extra whitespace", () => {
		expect(parseValue("  tag1  ,  tag2  ,  tag3  ")).toEqual(["tag1", "tag2", "tag3"]);
	});

	it("should not parse arrays with empty items", () => {
		expect(parseValue("tag1, , tag3")).toBe("tag1, , tag3");
	});

	it("should parse JSON objects", () => {
		const jsonStr = '{"key": "value", "num": 123}';
		expect(parseValue(jsonStr)).toEqual({ key: "value", num: 123 });
	});

	it("should parse JSON arrays", () => {
		const jsonStr = '["item1", "item2", 123]';
		expect(parseValue(jsonStr)).toEqual(["item1", "item2", 123]);
	});

	it("should return string for invalid JSON", () => {
		expect(parseValue("{invalid json}")).toBe("{invalid json}");
		expect(parseValue("[invalid]")).toBe("[invalid]");
	});

	it("should return plain strings", () => {
		expect(parseValue("just a string")).toBe("just a string");
		expect(parseValue("[[wiki link]]")).toBe("[[wiki link]]");
	});

	it("should handle strings that look like numbers but have extra chars", () => {
		expect(parseValue("42px")).toBe("42px");
		expect(parseValue("3.14.159")).toBe("3.14.159");
	});
});

describe("formatValue", () => {
	it("should format boolean true as 'Yes'", () => {
		expect(formatValue(true)).toBe("Yes");
	});

	it("should format boolean false as 'No'", () => {
		expect(formatValue(false)).toBe("No");
	});

	it("should format numbers as strings", () => {
		expect(formatValue(42)).toBe("42");
		expect(formatValue(3.14)).toBe("3.14");
	});

	it("should format objects as pretty JSON", () => {
		const obj = { key: "value" };
		expect(formatValue(obj)).toBe(JSON.stringify(obj, null, 2));
	});

	it("should format null as string", () => {
		expect(formatValue(null)).toBe("null");
	});

	it("should format strings as-is", () => {
		expect(formatValue("hello")).toBe("hello");
	});

	it("should format arrays as JSON", () => {
		const arr = ["a", "b", "c"];
		expect(formatValue(arr)).toBe(JSON.stringify(arr, null, 2));
	});
});

describe("parseWikiLink", () => {
	it("should parse simple wiki link", () => {
		const result = parseWikiLink("[[My Note]]");
		expect(result).toEqual({
			linkPath: "My Note",
			displayText: "My Note",
		});
	});

	it("should parse wiki link with alias", () => {
		const result = parseWikiLink("[[path/to/note|Display Name]]");
		expect(result).toEqual({
			linkPath: "path/to/note",
			displayText: "Display Name",
		});
	});

	it("should handle wiki link with path", () => {
		const result = parseWikiLink("[[folder/subfolder/note]]");
		expect(result).toEqual({
			linkPath: "folder/subfolder/note",
			displayText: "folder/subfolder/note",
		});
	});

	it("should return null for non-wiki-link strings", () => {
		expect(parseWikiLink("plain text")).toBeNull();
		expect(parseWikiLink("[[incomplete")).toBeNull();
		expect(parseWikiLink("incomplete]]")).toBeNull();
	});

	it("should handle wiki links with whitespace", () => {
		const result = parseWikiLink("[[  My Note  |  Display  ]]");
		expect(result).toEqual({
			linkPath: "My Note",
			displayText: "Display",
		});
	});

	it("should handle empty wiki links", () => {
		const result = parseWikiLink("[[]]");
		expect(result).toEqual({
			linkPath: "",
			displayText: "",
		});
	});

	it("should handle multiple pipes (takes first)", () => {
		const result = parseWikiLink("[[path|alias|extra]]");
		expect(result).toEqual({
			linkPath: "path",
			displayText: "alias|extra",
		});
	});
});
