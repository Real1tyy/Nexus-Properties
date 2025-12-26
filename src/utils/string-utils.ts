/**
 * Strips the parent name prefix from a display name if it matches common patterns.
 * Handles three patterns:
 * 1. Parent name + space (e.g., "Females Addictions" → "Addictions")
 * 2. Parent name + " - " (e.g., "Cold Approaching - Only Repels" → "Only Repels")
 * 3. Parent name + "-" (e.g., "Cold Approaching-Real1ty" → "Real1ty")
 *
 * @param displayName - The display name to strip the prefix from
 * @param parentDisplayName - The parent display name to strip
 * @returns The display name with the parent prefix removed, or the original name if no match
 */
export function stripParentPrefix(displayName: string, parentDisplayName: string): string {
	if (!parentDisplayName) return displayName;

	// Pattern 2: Parent name followed by " - " (dash with spaces) - check first to avoid matching pattern 1
	if (displayName.startsWith(`${parentDisplayName} - `)) {
		return displayName.slice(parentDisplayName.length + 3);
	}

	// Pattern 1: Parent name followed by space
	if (displayName.startsWith(`${parentDisplayName} `)) {
		return displayName.slice(parentDisplayName.length + 1);
	}

	// Pattern 3: Parent name followed by "-" (dash without spaces)
	if (displayName.startsWith(`${parentDisplayName}-`)) {
		return displayName.slice(parentDisplayName.length + 1);
	}

	return displayName;
}
