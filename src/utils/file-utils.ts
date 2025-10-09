import type { App, TFile } from "obsidian";
import { normalizePath } from "obsidian";

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
