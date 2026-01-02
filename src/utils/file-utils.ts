import type { App, TFile } from "obsidian";

/**
 * Builds a proper file path for wiki links, handling root directory correctly.
 * When a file is in the root directory (parent.path is "/" or empty), returns path with leading slash.
 * Otherwise, returns the full path with folder.
 *
 * @param file - TFile instance
 * @returns File path suitable for wiki links (without extension)
 *
 * @example
 * // File in root directory
 * buildFilePathForWikiLink(fileInRoot)
 * // Returns: "/Parent"
 *
 * @example
 * // File in subdirectory
 * buildFilePathForWikiLink(fileInFolder)
 * // Returns: "folder/Parent"
 */
export function buildFilePathForWikiLink(file: TFile): string {
	const parentPath = file.parent?.path;

	// Handle root directory: parent.path is "/" or empty - include leading slash
	if (!parentPath || parentPath === "/") {
		return `/${file.basename}`;
	}

	// For subdirectories, check if path already ends with slash to avoid duplication
	const separator = parentPath.endsWith("/") ? "" : "/";
	return `${parentPath}${separator}${file.basename}`;
}

/**
 * Generates a unique file path for parent nodes with intelligent number placement.
 * Numbers are placed before the dash to make sense for parent node naming.
 *
 * @param app - Obsidian App instance
 * @param folder - Folder path where the file will be created
 * @param sourceBasename - Base name of the source file (without extension)
 * @returns Unique file path with .md extension
 *
 * @example
 * // First parent node
 * getUniqueParentFilePath(app, "folder", "Child")
 * // Returns: "folder/ - Child.md"
 *
 * @example
 * // If " - Child.md" already exists
 * getUniqueParentFilePath(app, "folder", "Child")
 * // Returns: "folder/1 - Child.md"
 *
 * @example
 * // If "1 - Child.md" already exists
 * getUniqueParentFilePath(app, "folder", "Child")
 * // Returns: "folder/2 - Child.md"
 */
export function getUniqueParentFilePath(app: App, folder: string, sourceBasename: string): string {
	const basePath = folder ? `${folder}/ - ${sourceBasename}` : ` - ${sourceBasename}`;

	// Check if base path exists
	if (!app.vault.getAbstractFileByPath(`${basePath}.md`)) {
		return `${basePath}.md`;
	}

	// If it exists, try with incrementing numbers before the dash
	let counter = 1;
	let candidatePath: string;
	do {
		candidatePath = folder ? `${folder}/${counter} - ${sourceBasename}.md` : `${counter} - ${sourceBasename}.md`;
		counter++;
	} while (app.vault.getAbstractFileByPath(candidatePath));

	return candidatePath;
}
