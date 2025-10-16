import type { Frontmatter } from "../types/settings";

// ============================================================================
// Value Checking
// ============================================================================

export function isEmptyValue(value: unknown): boolean {
	if (value === null || value === undefined) {
		return true;
	}

	if (typeof value === "string" && value.trim() === "") {
		return true;
	}

	if (Array.isArray(value) && value.length === 0) {
		return true;
	}

	return false;
}

// ============================================================================
// Value Serialization & Parsing (for editing in input fields)
// ============================================================================

/**
 * Serializes a frontmatter value to a string for editing in input fields.
 * Arrays are joined with ", " for easier editing.
 */
export function serializeValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	if (Array.isArray(value)) {
		return value.map((item) => serializeValue(item)).join(", ");
	}

	if (typeof value === "object") {
		return JSON.stringify(value);
	}

	return String(value);
}

/**
 * Parses a string value from an input field into the appropriate type.
 * Handles: booleans, numbers, JSON objects/arrays, comma-separated arrays, and strings.
 */
export function parseValue(rawValue: string): unknown {
	const trimmed = rawValue.trim();

	if (trimmed === "") {
		return "";
	}

	// Parse boolean
	if (trimmed.toLowerCase() === "true") {
		return true;
	}
	if (trimmed.toLowerCase() === "false") {
		return false;
	}

	// Parse number
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
		const num = Number(trimmed);
		if (!Number.isNaN(num)) {
			return num;
		}
	}

	// Parse JSON object or array (check BEFORE comma-separated arrays)
	if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
		try {
			return JSON.parse(trimmed);
		} catch {
			// If parsing fails, continue to other checks
		}
	}

	// Parse comma-separated array
	if (trimmed.includes(",")) {
		const items = trimmed.split(",").map((item) => item.trim());

		if (items.every((item) => item.length > 0)) {
			return items;
		}
	}

	// Default: return as string
	return trimmed;
}

// ============================================================================
// Value Formatting (for display in read-only contexts)
// ============================================================================

/**
 * Formats a frontmatter value for display in read-only contexts.
 * Converts booleans to "Yes"/"No", numbers to strings, and objects to JSON.
 */
export function formatValue(value: unknown): string {
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}

	if (typeof value === "number") {
		return value.toString();
	}

	if (typeof value === "object" && value !== null) {
		return JSON.stringify(value, null, 2);
	}

	return String(value);
}

// ============================================================================
// Wiki Link Parsing
// ============================================================================

/**
 * Parses wiki link syntax from a string value.
 * Supports both [[path]] and [[path|alias]] formats.
 * Returns null if the string is not a wiki link.
 */
export function parseWikiLink(value: string): { linkPath: string; displayText: string } | null {
	const wikiLinkMatch = value.match(/^\[\[([^\]]*)\]\]$/);
	if (!wikiLinkMatch) {
		return null;
	}

	const innerContent = wikiLinkMatch[1];
	const pipeIndex = innerContent.indexOf("|");

	const linkPath = pipeIndex !== -1 ? innerContent.substring(0, pipeIndex).trim() : innerContent.trim();

	const displayText = pipeIndex !== -1 ? innerContent.substring(pipeIndex + 1).trim() : linkPath;

	return { linkPath, displayText };
}

// ============================================================================
// Property Normalization
// ============================================================================

/**
 * Normalizes frontmatter property values to an array of strings.
 * Handles various YAML formats and ensures consistent output.
 *
 * @param value - The raw frontmatter property value (can be any type)
 * @param propertyName - Optional property name for logging purposes
 * @returns Array of strings, or empty array if value is invalid/unexpected
 *
 * @example
 * // Single string value
 * normalizeProperty("[[link]]") // ["[[link]]"]
 *
 * // Array of strings
 * normalizeProperty(["[[link1]]", "[[link2]]"]) // ["[[link1]]", "[[link2]]"]
 *
 * // Mixed array (filters out non-strings)
 * normalizeProperty(["[[link]]", 42, null]) // ["[[link]]"]
 *
 * // Invalid types
 * normalizeProperty(null) // []
 * normalizeProperty(undefined) // []
 * normalizeProperty(42) // []
 * normalizeProperty({}) // []
 */
export function normalizeProperty(value: unknown, propertyName?: string): string[] {
	// Handle undefined and null
	if (value === undefined || value === null) {
		return [];
	}

	// Handle string values - convert to single-item array
	if (typeof value === "string") {
		// Empty strings should return empty array
		if (value.trim() === "") {
			return [];
		}
		return [value];
	}

	// Handle array values
	if (Array.isArray(value)) {
		// Empty arrays
		if (value.length === 0) {
			return [];
		}

		// Filter to only string values
		const stringValues = value.filter((item): item is string => {
			if (typeof item === "string") {
				return true;
			}

			// Log warning for non-string items
			if (propertyName) {
				console.warn(`Property "${propertyName}" contains non-string value (${typeof item}), filtering it out:`, item);
			}
			return false;
		});

		// Filter out empty strings
		const nonEmptyStrings = stringValues.filter((s) => s.trim() !== "");

		return nonEmptyStrings;
	}

	// Handle unexpected types (numbers, booleans, objects, etc.)
	if (propertyName) {
		console.warn(
			`Property "${propertyName}" has unexpected type (${typeof value}), returning empty array. Value:`,
			value
		);
	}

	return [];
}

/**
 * Batch normalize multiple property values from frontmatter.
 * Useful for processing multiple properties at once.
 *
 * @param frontmatter - The frontmatter object
 * @param propertyNames - Array of property names to normalize
 * @returns Map of property names to normalized string arrays
 *
 * @example
 * const frontmatter = {
 *   parent: "[[Parent]]",
 *   children: ["[[Child1]]", "[[Child2]]"],
 *   related: null
 * };
 *
 * const normalized = normalizeProperties(frontmatter, ["parent", "children", "related"]);
 * // Map {
 * //   "parent" => ["[[Parent]]"],
 * //   "children" => ["[[Child1]]", "[[Child2]]"],
 * //   "related" => []
 * // }
 */
export function normalizeProperties(frontmatter: Frontmatter, propertyNames: string[]): Map<string, string[]> {
	const result = new Map<string, string[]>();

	for (const propName of propertyNames) {
		const value = frontmatter[propName];
		result.set(propName, normalizeProperty(value, propName));
	}

	return result;
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncates a string to a maximum length, adding ellipsis if needed.
 */
export function truncateString(text: string, maxLength: number): string {
	return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

/**
 * Removes wiki link syntax from a string for cleaner display.
 * Converts [[Link|Alias]] to just "Link" or [[Link]] to "Link".
 */
export function removeWikiLinks(text: string): string {
	return text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1");
}

// ============================================================================
// Array Formatting Utilities
// ============================================================================

/**
 * Formats an array as a compact comma-separated string with smart truncation.
 * Shows "item1, item2, +3" if the full list would exceed maxLength.
 */
export function formatArrayCompact(items: string[], maxLength: number): string {
	if (items.length === 0) {
		return "";
	}

	// Single item - just truncate it
	if (items.length === 1) {
		return truncateString(items[0], maxLength);
	}

	const joined = items.join(", ");

	// Fits within limit - return as is
	if (joined.length <= maxLength) {
		return joined;
	}

	// Too long - show first few items + count
	let result = "";
	let count = 0;

	for (const item of items) {
		const testResult = result ? `${result}, ${item}` : item;

		if (testResult.length > maxLength - 5) {
			const remaining = items.length - count;
			return `${result}${remaining > 0 ? `, +${remaining}` : ""}`;
		}

		result = testResult;
		count++;
	}

	return result;
}

// ============================================================================
// Node Display Formatting
// ============================================================================

/**
 * Formats a frontmatter value for compact display inside graph nodes.
 * Truncates long values and handles arrays gracefully.
 *
 * @param value - The frontmatter value to format
 * @param maxLength - Maximum length before truncation (default: 20)
 * @returns Formatted string suitable for node display
 *
 * @example
 * formatValueForNode("completed") // "completed"
 * formatValueForNode("A very long string that exceeds the limit") // "A very long string..."
 * formatValueForNode(["tag1", "tag2", "tag3"]) // "tag1, tag2, tag3"
 * formatValueForNode(["tag1", "tag2", "tag3", "tag4", "tag5"], 15) // "tag1, tag2, +3"
 * formatValueForNode(true) // "Yes"
 * formatValueForNode(42) // "42"
 */
export function formatValueForNode(value: unknown, maxLength = 20): string {
	if (isEmptyValue(value)) {
		return "";
	}

	// Booleans: reuse formatValue logic
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}

	// Numbers: reuse formatValue logic
	if (typeof value === "number") {
		return value.toString();
	}

	// Arrays: extract strings and format compactly
	if (Array.isArray(value)) {
		const stringValues = value.filter((item): item is string => typeof item === "string");
		return formatArrayCompact(stringValues, maxLength);
	}

	// Strings: clean wiki links and truncate
	if (typeof value === "string") {
		const cleaned = removeWikiLinks(value);
		return truncateString(cleaned, maxLength);
	}

	// Objects: stringify and truncate
	if (typeof value === "object" && value !== null) {
		const jsonStr = JSON.stringify(value);
		return truncateString(jsonStr, maxLength);
	}

	return String(value);
}
