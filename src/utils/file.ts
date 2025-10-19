import type { App, CachedMetadata, TFile } from "obsidian";
import { normalizePath } from "obsidian";

// ============================================================================
// File Path Operations
// ============================================================================

/**
 * Retrieves a TFile object from the vault by its path.
 * Handles path normalization using Obsidian's normalizePath utility.
 *
 * **Important**: Obsidian file paths ALWAYS include the `.md` extension.
 * The TFile.path property returns paths like "folder/file.md", not "folder/file".
 *
 * @param app - The Obsidian App instance
 * @param filePath - Path to the file (will be normalized, should include .md extension)
 * @returns TFile if found, null otherwise
 *
 * @example
 * ```ts
 * // Correct: Include .md extension
 * const file = getFileByPath(app, "folder/note.md");
 *
 * // For wikilinks without extension, add .md
 * const linkPath = "MyNote";
 * const file = getFileByPath(app, `${linkPath}.md`);
 * ```
 */
export function getFileByPath(app: App, filePath: string): TFile | null {
	// Normalize the path using Obsidian's utility
	// This handles slashes, spaces, and platform-specific path issues
	const normalizedPath = normalizePath(filePath);

	// Use Vault's direct lookup method (most efficient)
	const file = app.vault.getFileByPath(normalizedPath);

	return file;
}

/**
 * Ensures a file path includes the .md extension.
 * Use this when working with wikilinks or user input that may omit extensions.
 *
 * @param path - File path that may or may not include .md extension
 * @returns Path guaranteed to end with .md
 *
 * @example
 * ```ts
 * ensureMarkdownExtension("MyNote") // "MyNote.md"
 * ensureMarkdownExtension("MyNote.md") // "MyNote.md"
 * ensureMarkdownExtension("folder/note") // "folder/note.md"
 * ```
 */
export function ensureMarkdownExtension(path: string): string {
	return path.endsWith(".md") ? path : `${path}.md`;
}

/**
 * Removes the .md extension from a file path if present.
 * Useful for displaying file names or creating wikilinks.
 *
 * @param path - File path that may include .md extension
 * @returns Path without .md extension
 *
 * @example
 * ```ts
 * removeMarkdownExtension("folder/note.md") // "folder/note"
 * removeMarkdownExtension("folder/note") // "folder/note"
 * ```
 */
export function removeMarkdownExtension(path: string): string {
	return path.endsWith(".md") ? path.slice(0, -3) : path;
}

// ============================================================================
// File Name Extraction
// ============================================================================

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

// ============================================================================
// File Context
// ============================================================================

export interface FileContext {
	path: string;
	pathWithExt: string;
	baseName: string;
	file: TFile | null;
	frontmatter: Record<string, any> | undefined;
	cache: CachedMetadata | null;
}

/**
 * Creates a comprehensive file context object containing all relevant file information.
 * Handles path normalization, file lookup, and metadata caching.
 */
export function getFileContext(app: App, path: string): FileContext {
	const pathWithExt = ensureMarkdownExtension(path);
	const baseName = removeMarkdownExtension(path);
	const file = getFileByPath(app, pathWithExt);
	const cache = file ? app.metadataCache.getFileCache(file) : null;
	const frontmatter = cache?.frontmatter;

	return {
		path,
		pathWithExt,
		baseName,
		file,
		frontmatter,
		cache,
	};
}

/**
 * Helper function to work with file context that automatically handles file not found cases.
 * Returns null if the file doesn't exist, otherwise executes the callback with the context.
 */
export async function withFileContext<T>(
	app: App,
	path: string,
	callback: (context: FileContext) => Promise<T> | T
): Promise<T | null> {
	const context = getFileContext(app, path);
	if (!context.file) {
		console.warn(`File not found: ${context.pathWithExt}`);
		return null;
	}
	return await callback(context);
}

// ============================================================================
// File Path Generation
// ============================================================================

/**
 * Generates a unique file path by appending a counter if the file already exists.
 * Automatically adds .md extension if not present.
 *
 * @param app - The Obsidian App instance
 * @param folder - Folder path (empty string for root, no trailing slash needed)
 * @param baseName - Base file name without extension
 * @returns Unique file path that doesn't exist in the vault
 *
 * @example
 * ```ts
 * // If "MyNote.md" exists, returns "MyNote 1.md"
 * const path = getUniqueFilePath(app, "", "MyNote");
 *
 * // With folder: "Projects/Task.md" -> "Projects/Task 1.md"
 * const path = getUniqueFilePath(app, "Projects", "Task");
 *
 * // Root folder handling
 * const path = getUniqueFilePath(app, "/", "Note"); // -> "Note.md"
 * ```
 */
export function getUniqueFilePath(app: App, folder: string, baseName: string): string {
	const normalizedFolder = folder && folder !== "/" ? folder : "";
	const folderPath = normalizedFolder ? `${normalizedFolder}/` : "";

	let fileName = `${baseName}.md`;
	let fullPath = `${folderPath}${fileName}`;
	let counter = 1;

	while (app.vault.getAbstractFileByPath(fullPath)) {
		fileName = `${baseName} ${counter}.md`;
		fullPath = `${folderPath}${fileName}`;
		counter++;
	}

	return fullPath;
}
