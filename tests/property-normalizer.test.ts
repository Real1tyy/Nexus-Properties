import * as fc from "fast-check";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeProperties, normalizeProperty } from "../src/utils/property-normalizer";

describe("normalizeProperty", () => {
	beforeEach(() => {
		// Reset console.warn mock before each test
		vi.clearAllMocks();
	});

	describe("Basic type handling", () => {
		it("should return empty array for undefined", () => {
			expect(normalizeProperty(undefined)).toEqual([]);
		});

		it("should return empty array for null", () => {
			expect(normalizeProperty(null)).toEqual([]);
		});

		it("should convert single string to array", () => {
			expect(normalizeProperty("[[link]]")).toEqual(["[[link]]"]);
		});

		it("should return empty array for empty string", () => {
			expect(normalizeProperty("")).toEqual([]);
		});

		it("should return empty array for whitespace-only string", () => {
			expect(normalizeProperty("   ")).toEqual([]);
			expect(normalizeProperty("\t\n  ")).toEqual([]);
		});

		it("should return empty array for numbers", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(42, "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Property "testProp" has unexpected type'),
				42
			);
		});

		it("should return empty array for booleans", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(true, "testProp")).toEqual([]);
			expect(normalizeProperty(false, "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
		});

		it("should return empty array for objects", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty({ key: "value" }, "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Property "testProp" has unexpected type'), {
				key: "value",
			});
		});

		it("should return empty array for functions", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const fn = () => {};
			expect(normalizeProperty(fn, "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("should return empty array for symbols", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const sym = Symbol("test");
			expect(normalizeProperty(sym, "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe("Array handling", () => {
		it("should return empty array for empty array", () => {
			expect(normalizeProperty([])).toEqual([]);
		});

		it("should preserve array of strings", () => {
			expect(normalizeProperty(["[[link1]]", "[[link2]]"])).toEqual(["[[link1]]", "[[link2]]"]);
		});

		it("should filter out non-string values from array", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(["[[link]]", 42, null, undefined, "[[link2]]"], "testProp")).toEqual([
				"[[link]]",
				"[[link2]]",
			]);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(3); // 42, null, undefined
		});

		it("should filter out empty strings from array", () => {
			expect(normalizeProperty(["[[link1]]", "", "[[link2]]", "   ", "[[link3]]"])).toEqual([
				"[[link1]]",
				"[[link2]]",
				"[[link3]]",
			]);
		});

		it("should handle array with only invalid values", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty([42, null, undefined, true], "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(4);
		});

		it("should handle nested arrays", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(["[[link]]", ["nested"]], "testProp")).toEqual(["[[link]]"]);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Property "testProp" contains non-string value'),
				["nested"]
			);
		});

		it("should handle array with objects", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(["[[link]]", { key: "value" }], "testProp")).toEqual(["[[link]]"]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe("Obsidian frontmatter formats", () => {
		it("should handle single wikilink", () => {
			expect(normalizeProperty("[[Goals/Health|Health]]")).toEqual(["[[Goals/Health|Health]]"]);
		});

		it("should handle array of wikilinks", () => {
			expect(
				normalizeProperty([
					"[[Goals/Healthy & Body - Keep Feeling Better|Healthy & Body - Keep Feeling Better]]",
					"[[Tags/Health|Health]]",
					"[[Tags/Exercise|Exercise]]",
				])
			).toEqual([
				"[[Goals/Healthy & Body - Keep Feeling Better|Healthy & Body - Keep Feeling Better]]",
				"[[Tags/Health|Health]]",
				"[[Tags/Exercise|Exercise]]",
			]);
		});

		it("should handle plain file references", () => {
			expect(normalizeProperty("path/to/file.md")).toEqual(["path/to/file.md"]);
		});

		it("should handle array of plain file references", () => {
			expect(normalizeProperty(["file1.md", "folder/file2.md"])).toEqual(["file1.md", "folder/file2.md"]);
		});

		it("should handle mixed wikilinks and plain references", () => {
			expect(normalizeProperty(["[[wikilink]]", "plain/path.md"])).toEqual(["[[wikilink]]", "plain/path.md"]);
		});

		it("should handle wikilinks with special characters", () => {
			expect(
				normalizeProperty([
					"[[File with spaces]]",
					"[[File & Ampersand]]",
					"[[File-with-dashes]]",
					"[[File_with_underscores]]",
				])
			).toEqual(["[[File with spaces]]", "[[File & Ampersand]]", "[[File-with-dashes]]", "[[File_with_underscores]]"]);
		});
	});

	describe("Warning logging", () => {
		it("should log warning when propertyName is provided for invalid type", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			normalizeProperty(42, "MyProperty");
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Property "MyProperty" has unexpected type'),
				42
			);
		});

		it("should not log warning when propertyName is not provided", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			normalizeProperty(42);
			expect(consoleWarnSpy).not.toHaveBeenCalled();
		});

		it("should log warning for non-string array items", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			normalizeProperty(["[[link]]", 42, null], "MyProperty");
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Property "MyProperty" contains non-string value'),
				42
			);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Property "MyProperty" contains non-string value'),
				null
			);
		});
	});

	describe("Property-based tests with fast-check", () => {
		it("should always return an array", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const result = normalizeProperty(value);
					expect(Array.isArray(result)).toBe(true);
				})
			);
		});

		it("should only return strings in the array", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const result = normalizeProperty(value);
					result.forEach((item) => {
						expect(typeof item).toBe("string");
					});
				})
			);
		});

		it("should not return empty strings", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const result = normalizeProperty(value);
					result.forEach((item) => {
						expect(item.trim()).not.toBe("");
					});
				})
			);
		});

		it("should preserve valid string arrays", () => {
			fc.assert(
				fc.property(fc.array(fc.string().filter((s) => s.trim() !== "")), (stringArray) => {
					const result = normalizeProperty(stringArray);
					expect(result).toEqual(stringArray);
				})
			);
		});

		it("should convert single non-empty strings to single-item arrays", () => {
			fc.assert(
				fc.property(
					fc.string().filter((s) => s.trim() !== ""),
					(str) => {
						const result = normalizeProperty(str);
						expect(result).toEqual([str]);
					}
				)
			);
		});

		it("should return empty array for null/undefined", () => {
			fc.assert(
				fc.property(fc.constantFrom(null, undefined), (value) => {
					const result = normalizeProperty(value);
					expect(result).toEqual([]);
				})
			);
		});

		it("should handle mixed arrays with only strings extracted", () => {
			fc.assert(
				fc.property(
					fc.array(
						fc.oneof(
							fc.string().filter((s) => s.trim() !== ""),
							fc.integer(),
							fc.boolean(),
							fc.constant(null),
							fc.constant(undefined)
						)
					),
					(mixedArray) => {
						vi.spyOn(console, "warn").mockImplementation(() => {});
						const result = normalizeProperty(mixedArray);
						const expectedStrings = mixedArray.filter((item) => typeof item === "string" && item.trim() !== "");
						expect(result).toEqual(expectedStrings);
					}
				)
			);
		});

		it("should be idempotent for valid inputs", () => {
			fc.assert(
				fc.property(fc.array(fc.string().filter((s) => s.trim() !== "")), (stringArray) => {
					const firstPass = normalizeProperty(stringArray);
					const secondPass = normalizeProperty(firstPass);
					expect(firstPass).toEqual(secondPass);
				})
			);
		});

		it("should handle deeply nested structures gracefully", () => {
			fc.assert(
				fc.property(
					fc.array(fc.oneof(fc.string(), fc.array(fc.anything()), fc.object(), fc.integer(), fc.constant(null))),
					(complexArray) => {
						vi.spyOn(console, "warn").mockImplementation(() => {});
						const result = normalizeProperty(complexArray);
						// Should always return an array without throwing
						expect(Array.isArray(result)).toBe(true);
					}
				)
			);
		});

		it("should handle large arrays efficiently", () => {
			fc.assert(
				fc.property(fc.array(fc.string(), { minLength: 1000, maxLength: 5000 }), (largeArray) => {
					const start = Date.now();
					const result = normalizeProperty(largeArray);
					const duration = Date.now() - start;

					// Should complete in reasonable time (< 100ms)
					expect(duration).toBeLessThan(100);
					// Should preserve all valid strings
					expect(result.length).toBeLessThanOrEqual(largeArray.length);
				})
			);
		});

		it("should handle wikilink format strings", () => {
			const wikilinkArb = fc
				.tuple(fc.string(), fc.option(fc.string()))
				.map(([path, alias]) => (alias ? `[[${path}|${alias}]]` : `[[${path}]]`));

			fc.assert(
				fc.property(fc.array(wikilinkArb), (wikilinks) => {
					const result = normalizeProperty(wikilinks);
					expect(result).toEqual(wikilinks);
				})
			);
		});
	});

	describe("Edge cases", () => {
		it("should handle BigInt", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(BigInt(9007199254740991), "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("should handle Date objects", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(new Date(), "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("should handle RegExp", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(/regex/, "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("should handle Map", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(new Map(), "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("should handle Set", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(normalizeProperty(new Set(), "testProp")).toEqual([]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("should handle array with circular references", () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const circular: any[] = ["[[link]]"];
			circular.push(circular);
			expect(normalizeProperty(circular, "testProp")).toEqual(["[[link]]"]);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("should handle very long strings", () => {
			const longString = `[[${"a".repeat(10000)}]]`;
			expect(normalizeProperty(longString)).toEqual([longString]);
		});

		it("should handle unicode characters", () => {
			expect(normalizeProperty(["[[文件]]", "[[файл]]", "[[🎯 Goal]]"])).toEqual([
				"[[文件]]",
				"[[файл]]",
				"[[🎯 Goal]]",
			]);
		});

		it("should handle special YAML characters", () => {
			expect(normalizeProperty(["[[file: with colon]]", "[[file | with pipe]]", "[[file # with hash]]"])).toEqual([
				"[[file: with colon]]",
				"[[file | with pipe]]",
				"[[file # with hash]]",
			]);
		});
	});
});

describe("normalizeProperties", () => {
	it("should normalize multiple properties from frontmatter", () => {
		const frontmatter = {
			parent: "[[Parent]]",
			children: ["[[Child1]]", "[[Child2]]"],
			related: null,
			other: 42,
		};

		const result = normalizeProperties(frontmatter, ["parent", "children", "related", "other"]);

		expect(result.get("parent")).toEqual(["[[Parent]]"]);
		expect(result.get("children")).toEqual(["[[Child1]]", "[[Child2]]"]);
		expect(result.get("related")).toEqual([]);
		expect(result.get("other")).toEqual([]);
	});

	it("should handle missing properties", () => {
		const frontmatter = {
			parent: "[[Parent]]",
		};

		const result = normalizeProperties(frontmatter, ["parent", "children"]);

		expect(result.get("parent")).toEqual(["[[Parent]]"]);
		expect(result.get("children")).toEqual([]);
	});

	it("should return empty map for empty property names array", () => {
		const frontmatter = {
			parent: "[[Parent]]",
		};

		const result = normalizeProperties(frontmatter, []);

		expect(result.size).toBe(0);
	});

	it("should handle empty frontmatter", () => {
		const result = normalizeProperties({}, ["parent", "children"]);

		expect(result.get("parent")).toEqual([]);
		expect(result.get("children")).toEqual([]);
	});

	describe("Property-based tests", () => {
		it("should always return a Map with correct keys", () => {
			fc.assert(
				fc.property(fc.dictionary(fc.string(), fc.anything()), fc.array(fc.string()), (frontmatter, propNames) => {
					const result = normalizeProperties(frontmatter, propNames);
					// Map deduplicates keys, so check unique property names
					const uniquePropNames = [...new Set(propNames)];
					expect(result.size).toBe(uniquePropNames.length);
					uniquePropNames.forEach((name) => {
						expect(result.has(name)).toBe(true);
					});
				})
			);
		});

		it("should return arrays of strings for all properties", () => {
			fc.assert(
				fc.property(fc.dictionary(fc.string(), fc.anything()), fc.array(fc.string()), (frontmatter, propNames) => {
					vi.spyOn(console, "warn").mockImplementation(() => {});
					const result = normalizeProperties(frontmatter, propNames);
					result.forEach((value) => {
						expect(Array.isArray(value)).toBe(true);
						value.forEach((item) => {
							expect(typeof item).toBe("string");
							expect(item.trim()).not.toBe("");
						});
					});
				})
			);
		});
	});
});
