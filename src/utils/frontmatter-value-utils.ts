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
