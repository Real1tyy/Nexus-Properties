import { formatWikiLink, parsePropertyLinks } from "./link-parser";

/**
 * Adds a link to a property array, avoiding duplicates.
 *
 * **Note**: Assumes property has been normalized to string[] via normalizeProperty.
 * **Important**: linkPath should be WITHOUT .md extension (wikilink format).
 *
 * @param currentValue - The current property array
 * @param linkPath - The file path to add (without .md extension, e.g., "folder/file")
 * @returns New array with link added, or same array if link already exists
 *
 * @example
 * ```ts
 * addLinkToProperty([], "MyNote") // ["[[MyNote]]"]
 * addLinkToProperty(["[[Note1]]"], "Note2") // ["[[Note1]]", "[[Note2]]"]
 * addLinkToProperty(["[[Note1]]"], "Note1") // ["[[Note1]]"] (no change)
 * ```
 */
export function addLinkToProperty(currentValue: string[], linkPath: string): string[] {
	const existingPaths = parsePropertyLinks(currentValue);

	// Only add if not already present
	if (!existingPaths.includes(linkPath)) {
		return [...currentValue, formatWikiLink(linkPath)];
	}

	return currentValue;
}

/**
 * Removes a link from a property array.
 *
 * **Note**: Assumes property has been normalized to string[] via normalizeProperty.
 *
 * @param currentValue - The current property array
 * @param linkPath - The file path to remove (without .md extension)
 * @returns New array with link removed (can be empty)
 *
 * @example
 * ```ts
 * removeLinkFromProperty(["[[Note1]]", "[[Note2]]"], "Note1") // ["[[Note2]]"]
 * removeLinkFromProperty(["[[Note1]]"], "Note1") // []
 * removeLinkFromProperty(["[[Note1]]"], "Note2") // ["[[Note1]]"] (no change)
 * ```
 */
export function removeLinkFromProperty(currentValue: string[], linkPath: string): string[] {
	return currentValue.filter((item) => {
		const parsed = parsePropertyLinks([item])[0];
		return parsed !== linkPath;
	});
}

/**
 * Checks if a link exists in a property array.
 *
 * **Note**: Assumes property has been normalized to string[] via normalizeProperty.
 *
 * @param currentValue - The current property array
 * @param linkPath - The file path to check (without .md extension)
 * @returns True if the link exists in the array
 *
 * @example
 * ```ts
 * hasLinkInProperty(["[[Note1]]", "[[Note2]]"], "Note1") // true
 * hasLinkInProperty(["[[Note1]]"], "Note2") // false
 * hasLinkInProperty([], "Note1") // false
 * ```
 */
export function hasLinkInProperty(currentValue: string[], linkPath: string): boolean {
	const existingPaths = parsePropertyLinks(currentValue);
	return existingPaths.includes(linkPath);
}
