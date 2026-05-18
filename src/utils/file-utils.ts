import { extractDisplayName, extractFilePath } from "@real1ty-obsidian-plugins";
import { TFile, type App } from "obsidian";

import type { RelationshipResolver } from "../types/hierarchy";

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

/**
 * Resolves the display name for a file, preferring the title property if available.
 * Falls back to extracting the display name from the path or wiki link.
 *
 * This mirrors the pattern used in the graph view for consistent naming across views.
 *
 * @param app - Obsidian App instance
 * @param pathOrWikiLink - File path or wiki link to resolve
 * @param titleProp - The frontmatter property name used for titles (e.g., "title")
 * @returns The resolved display name
 */
export function resolveDisplayName(app: App, pathOrWikiLink: string, titleProp: string): string {
	const file = app.vault.getAbstractFileByPath(pathOrWikiLink);
	if (file instanceof TFile) {
		const cache = app.metadataCache.getFileCache(file);
		const titleValue = cache?.frontmatter?.[titleProp];
		if (titleValue) {
			return extractDisplayName(String(titleValue));
		}
	}
	return extractDisplayName(pathOrWikiLink);
}

export interface ParentOption {
	path: string;
	displayName: string;
}

interface ResolveParentSelectionOptions {
	app: App;
	indexer: RelationshipResolver;
	file: TFile;
	prioritizeParentProp: string;
	overridePath?: string | undefined;
}

interface ParentSelectionResult {
	parents: ParentOption[];
	selectedPath: string | undefined;
}

/**
 * Resolves a file's parents from its relationships and determines which parent
 * should be selected in the dropdown (override → prioritized prop → first).
 */
export function resolveParentSelection(options: ResolveParentSelectionOptions): ParentSelectionResult {
	const { app, indexer, file, prioritizeParentProp, overridePath } = options;
	const parents: ParentOption[] = [];

	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter;
	if (frontmatter) {
		const relations = indexer.extractRelationships(file, frontmatter);
		for (const wikiLink of relations.parent) {
			const linkPath = extractFilePath(wikiLink);
			const resolved = app.metadataCache.getFirstLinkpathDest(linkPath, file.path);
			if (resolved) {
				const displayName = extractDisplayName(resolved.path);
				parents.push({ path: resolved.path, displayName });
			}
		}
	}

	let selectedPath = overridePath;
	if (!selectedPath && parents.length >= 2) {
		if (prioritizeParentProp && frontmatter?.[prioritizeParentProp]) {
			const prioritizedValue = String(frontmatter[prioritizeParentProp]).trim();
			const prioritizedPath = extractFilePath(prioritizedValue);
			const match = parents.find(
				(p) => p.path === prioritizedPath || extractDisplayName(p.path) === extractDisplayName(prioritizedPath)
			);
			if (match) {
				selectedPath = match.path;
			}
		}
		if (!selectedPath) {
			selectedPath = parents[0].path;
		}
	}

	return { parents, selectedPath };
}
