import type { FileRelationships } from "../../src/types/constants";
import type { Frontmatter } from "../../src/types/settings";

export function makeRelationships(overrides: Partial<FileRelationships> = {}): FileRelationships {
	return {
		filePath: "Note.md",
		mtime: 1_700_000_000_000,
		parent: [],
		children: [],
		related: [],
		frontmatter: {},
		...overrides,
	};
}

/**
 * Build a frontmatter map with the canonical relationship property names
 * ("Parent", "Child", "Related"). Pass extra keys via `extra` for non-relationship props.
 */
export function makeFrontmatter(
	opts: {
		parent?: string[];
		children?: string[];
		related?: string[];
		extra?: Frontmatter;
	} = {}
): Frontmatter {
	const fm: Frontmatter = { ...opts.extra };
	if (opts.parent !== undefined) fm["Parent"] = opts.parent;
	if (opts.children !== undefined) fm["Child"] = opts.children;
	if (opts.related !== undefined) fm["Related"] = opts.related;
	return fm;
}

export function wikiLink(path: string): string {
	return `[[${path}]]`;
}

export function wikiLinks(...paths: string[]): string[] {
	return paths.map(wikiLink);
}
