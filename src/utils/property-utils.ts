import { formatWikiLink, parsePropertyLinks } from "./link-parser";

/**
 * Adds a link to a property, avoiding duplicates.
 *
 * **Important**: linkPath should be WITHOUT .md extension (wikilink format).
 *
 * @param currentValue - The current property value (can be string, string[], or undefined)
 * @param linkPath - The file path to add (without .md extension, e.g., "folder/file")
 * @returns New array with link added, or same array if link already exists
 *
 * @example
 * ```ts
 * addLinkToProperty(undefined, "MyNote") // ["[[MyNote]]"]
 * addLinkToProperty("[[Note1]]", "Note2") // ["[[Note1]]", "[[Note2]]"]
 * addLinkToProperty(["[[Note1]]"], "Note2") // ["[[Note1]]", "[[Note2]]"]
 * addLinkToProperty(["[[Note1]]"], "Note1") // ["[[Note1]]"] (no change)
 * ```
 */
export function addLinkToProperty(currentValue: string | string[] | undefined, linkPath: string): string[] {
	// Handle undefined or null
	if (currentValue === undefined || currentValue === null) {
		return [formatWikiLink(linkPath)];
	}

	// Normalize to array
	const currentArray = Array.isArray(currentValue) ? currentValue : [currentValue];
	const existingPaths = parsePropertyLinks(currentArray);

	// Only add if not already present
	if (!existingPaths.includes(linkPath)) {
		return [...currentArray, formatWikiLink(linkPath)];
	}

	return currentArray;
}

/**
 * Removes a link from a property.
 *
 * @param currentValue - The current property value (can be string, string[], or undefined)
 * @param linkPath - The file path to remove (without .md extension)
 * @returns New array with link removed (can be empty)
 *
 * @example
 * ```ts
 * removeLinkFromProperty(["[[Note1]]", "[[Note2]]"], "Note1") // ["[[Note2]]"]
 * removeLinkFromProperty(["[[Note1]]"], "Note1") // []
 * removeLinkFromProperty("[[Note1]]", "Note1") // []
 * removeLinkFromProperty(undefined, "Note1") // []
 * ```
 */
export function removeLinkFromProperty(currentValue: string | string[] | undefined, linkPath: string): string[] {
	if (currentValue === undefined || currentValue === null) {
		return [];
	}

	// Normalize to array
	const currentArray = Array.isArray(currentValue) ? currentValue : [currentValue];

	return currentArray.filter((item) => {
		const parsed = parsePropertyLinks([item])[0];
		return parsed !== linkPath;
	});
}

/**
 * Checks if a link exists in a property.
 *
 * @param currentValue - The current property value (can be string, string[], or undefined)
 * @param linkPath - The file path to check (without .md extension)
 * @returns True if the link exists
 *
 * @example
 * ```ts
 * hasLinkInProperty(["[[Note1]]", "[[Note2]]"], "Note1") // true
 * hasLinkInProperty("[[Note1]]", "Note1") // true
 * hasLinkInProperty([], "Note1") // false
 * hasLinkInProperty(undefined, "Note1") // false
 * ```
 */
export function hasLinkInProperty(currentValue: string | string[] | undefined, linkPath: string): boolean {
	const existingPaths = parsePropertyLinks(currentValue);
	return existingPaths.includes(linkPath);
}
