import type { TFile } from "obsidian";
import type { FileRelationships } from "./constants";
import type { Frontmatter } from "./settings";

export interface HierarchyTraversalOptions {
	maxDepth?: number;
	includeRoot?: boolean;
	/** Path to mark as the current file in the tree (for highlighting) */
	highlightPath?: string;
	/** Start upward traversal from this parent path instead of the current file */
	parentOverridePath?: string;
	/** Property name to prioritize when choosing which parent to traverse upward */
	prioritizeParentProp?: string;
	/** MOC file path — required when using moc-content source */
	mocFilePath?: string;
	/** Filter callback — nodes whose frontmatter fails this check are excluded from traversal */
	nodeFilter?: (frontmatter: Record<string, unknown>) => boolean;
}

export interface RelationshipResolver {
	extractRelationships(file: TFile, frontmatter: Frontmatter): FileRelationships;
	getRelationshipsSnapshot(): ReadonlyMap<string, FileRelationships>;
}
