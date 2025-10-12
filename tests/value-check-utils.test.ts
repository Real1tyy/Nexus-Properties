import { describe, expect, it } from "vitest";
import { isEmptyValue } from "../src/utils/value-check-utils";

describe("isEmptyValue", () => {
	describe("null and undefined", () => {
		it("should return true for null", () => {
			expect(isEmptyValue(null)).toBe(true);
		});

		it("should return true for undefined", () => {
			expect(isEmptyValue(undefined)).toBe(true);
		});
	});

	describe("strings", () => {
		it("should return true for empty string", () => {
			expect(isEmptyValue("")).toBe(true);
		});

		it("should return true for whitespace-only string", () => {
			expect(isEmptyValue("   ")).toBe(true);
			expect(isEmptyValue("\t")).toBe(true);
			expect(isEmptyValue("\n")).toBe(true);
			expect(isEmptyValue(" \t\n ")).toBe(true);
		});

		it("should return false for non-empty string", () => {
			expect(isEmptyValue("hello")).toBe(false);
			expect(isEmptyValue("0")).toBe(false);
			expect(isEmptyValue(" a ")).toBe(false);
		});
	});

	describe("arrays", () => {
		it("should return true for empty array", () => {
			expect(isEmptyValue([])).toBe(true);
		});

		it("should return false for non-empty array", () => {
			expect(isEmptyValue([1])).toBe(false);
			expect(isEmptyValue([null])).toBe(false);
			expect(isEmptyValue([""])).toBe(false);
			expect(isEmptyValue([undefined])).toBe(false);
		});
	});

	describe("other types", () => {
		it("should return false for numbers", () => {
			expect(isEmptyValue(0)).toBe(false);
			expect(isEmptyValue(1)).toBe(false);
			expect(isEmptyValue(-1)).toBe(false);
			expect(isEmptyValue(3.14)).toBe(false);
		});

		it("should return false for booleans", () => {
			expect(isEmptyValue(false)).toBe(false);
			expect(isEmptyValue(true)).toBe(false);
		});

		it("should return false for objects", () => {
			expect(isEmptyValue({})).toBe(false);
			expect(isEmptyValue({ key: "value" })).toBe(false);
		});

		it("should return false for functions", () => {
			expect(isEmptyValue(() => {})).toBe(false);
		});

		it("should return false for symbols", () => {
			expect(isEmptyValue(Symbol("test"))).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle empty object (not empty)", () => {
			expect(isEmptyValue({})).toBe(false);
		});

		it("should handle string with only spaces", () => {
			expect(isEmptyValue("     ")).toBe(true);
		});

		it("should handle zero as not empty", () => {
			expect(isEmptyValue(0)).toBe(false);
		});

		it("should handle false as not empty", () => {
			expect(isEmptyValue(false)).toBe(false);
		});
	});
});
