import type { App, CachedMetadata, TFile } from "obsidian";
import { ensureMarkdownExtension, getFileByPath, removeMarkdownExtension } from "./file-utils";

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
