import type { App } from "obsidian";

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
