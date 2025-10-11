/**
 * Extracts the display name from a file path or wiki link.
 *
 * Handles various formats:
 * - `[[path/to/file|Alias]]` -> returns "Alias"
 * - `[[path/to/file]]` -> returns "file"
 * - `path/to/file.md` -> returns "file"
 * - `file.md` -> returns "file"
 *
 * @param input - File path or wiki link string
 * @returns The display name to show in the UI
 */
export function extractDisplayName(input: string): string {
	if (!input) return "";

	// Remove any surrounding whitespace
	const trimmed = input.trim();

	// Check if it's a wiki link format [[path|alias]] or [[path]]
	const wikiLinkMatch = trimmed.match(/^\[\[([^\]]+)\]\]$/);
	if (wikiLinkMatch) {
		const innerContent = wikiLinkMatch[1];

		// Check if there's an alias (pipe character)
		const pipeIndex = innerContent.indexOf("|");
		if (pipeIndex !== -1) {
			// Return the alias (everything after the pipe)
			return innerContent.substring(pipeIndex + 1).trim();
		}

		// No alias, extract filename from path
		const path = innerContent.trim();
		const lastSlashIndex = path.lastIndexOf("/");
		const filename = lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;
		return filename.replace(/\.md$/i, "");
	}

	// Not a wiki link, treat as regular path
	const lastSlashIndex = trimmed.lastIndexOf("/");
	const filename = lastSlashIndex !== -1 ? trimmed.substring(lastSlashIndex + 1) : trimmed;
	return filename.replace(/\.md$/i, "");
}

/**
 * Extracts the actual file path from a wiki link or returns the path as-is.
 *
 * Handles:
 * - `[[path/to/file|Alias]]` -> returns "path/to/file.md"
 * - `[[path/to/file]]` -> returns "path/to/file.md"
 * - `path/to/file.md` -> returns "path/to/file.md"
 *
 * @param input - File path or wiki link string
 * @returns The actual file path (with .md extension)
 */
export function extractFilePath(input: string): string {
	if (!input) return "";

	const trimmed = input.trim();

	// Check if it's a wiki link format [[path|alias]] or [[path]]
	const wikiLinkMatch = trimmed.match(/^\[\[([^\]]+)\]\]$/);
	if (wikiLinkMatch) {
		const innerContent = wikiLinkMatch[1];

		// Check if there's an alias (pipe character)
		const pipeIndex = innerContent.indexOf("|");
		const path = pipeIndex !== -1 ? innerContent.substring(0, pipeIndex).trim() : innerContent.trim();

		// Ensure .md extension
		return path.endsWith(".md") ? path : `${path}.md`;
	}

	// Not a wiki link, ensure .md extension
	return trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
}
