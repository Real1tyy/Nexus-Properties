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
export function normalizeProperties(
	frontmatter: Record<string, unknown>,
	propertyNames: string[]
): Map<string, string[]> {
	const result = new Map<string, string[]>();

	for (const propName of propertyNames) {
		const value = frontmatter[propName];
		result.set(propName, normalizeProperty(value, propName));
	}

	return result;
}
