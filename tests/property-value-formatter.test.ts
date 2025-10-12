import { describe, expect, it } from "vitest";
import { formatPropertyValue } from "../src/utils/property-value-formatter";

describe("formatPropertyValue", () => {
	describe("null and undefined", () => {
		it("should return empty string for null", () => {
			expect(formatPropertyValue(null)).toBe("");
		});

		it("should return empty string for undefined", () => {
			expect(formatPropertyValue(undefined)).toBe("");
		});
	});

	describe("arrays", () => {
		it("should join array elements with commas", () => {
			expect(formatPropertyValue(["a", "b", "c"])).toBe("a, b, c");
		});

		it("should handle empty arrays", () => {
			expect(formatPropertyValue([])).toBe("");
		});

		it("should handle single element arrays", () => {
			expect(formatPropertyValue(["single"])).toBe("single");
		});

		it("should handle arrays with numbers", () => {
			expect(formatPropertyValue([1, 2, 3])).toBe("1, 2, 3");
		});

		it("should handle mixed type arrays", () => {
			expect(formatPropertyValue(["text", 123, true])).toBe("text, 123, true");
		});
	});

	describe("objects", () => {
		it("should stringify objects", () => {
			expect(formatPropertyValue({ key: "value" })).toBe('{"key":"value"}');
		});

		it("should handle nested objects", () => {
			const nested = { outer: { inner: "value" } };
			expect(formatPropertyValue(nested)).toBe('{"outer":{"inner":"value"}}');
		});

		it("should handle empty objects", () => {
			expect(formatPropertyValue({})).toBe("{}");
		});
	});

	describe("primitives", () => {
		it("should convert strings to strings", () => {
			expect(formatPropertyValue("text")).toBe("text");
		});

		it("should convert numbers to strings", () => {
			expect(formatPropertyValue(123)).toBe("123");
			expect(formatPropertyValue(0)).toBe("0");
			expect(formatPropertyValue(-456)).toBe("-456");
			expect(formatPropertyValue(3.14)).toBe("3.14");
		});

		it("should convert booleans to strings", () => {
			expect(formatPropertyValue(true)).toBe("true");
			expect(formatPropertyValue(false)).toBe("false");
		});

		it("should handle empty strings", () => {
			expect(formatPropertyValue("")).toBe("");
		});
	});

	describe("edge cases", () => {
		it("should handle dates", () => {
			const date = new Date("2024-01-01");
			const result = formatPropertyValue(date);
			expect(result).toContain("2024");
		});

		it("should handle functions by stringifying", () => {
			const fn = () => "test";
			const result = formatPropertyValue(fn);
			expect(typeof result).toBe("string");
		});

		it("should handle symbols by converting to string", () => {
			const sym = Symbol("test");
			const result = formatPropertyValue(sym);
			expect(result).toContain("Symbol");
		});
	});
});
