/**
 * Matches separator characters at the start of a string (spaces, dashes, en-dashes, em-dashes).
 */
const SEPARATOR_PATTERN = /^[\s\-–—]+/;

/**
 * Strips the parent name prefix from a display name if it matches common patterns.
 * Handles patterns like:
 * - "Parent - Child" → "Child"
 * - "Parent – Child" → "Child" (en-dash)
 * - "Parent Child" → "Child"
 * - "Parent-Child" → "Child"
 *
 * @param displayName - The display name to strip the prefix from
 * @param parentDisplayName - The parent display name to strip
 * @returns The display name with the parent prefix removed, or the original name if no match
 */
export function stripParentPrefix(displayName: string, parentDisplayName: string): string {
	if (!parentDisplayName) return displayName;

	// Check if display name starts with parent name
	if (!displayName.startsWith(parentDisplayName)) {
		return displayName;
	}

	// Get the remainder after the parent name
	const remainder = displayName.slice(parentDisplayName.length);

	// Must have a separator after the parent name (space, dash, en-dash, em-dash)
	if (!SEPARATOR_PATTERN.test(remainder)) {
		return displayName;
	}

	// Strip leading separators to get the actual child name
	const stripped = remainder.replace(SEPARATOR_PATTERN, "");

	// Only return stripped version if we have meaningful content left
	return stripped || displayName;
}
