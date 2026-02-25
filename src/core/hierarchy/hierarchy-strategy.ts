import type { TFile } from "obsidian";
import type { RelationshipType } from "../../types/constants";
import type { HierarchyTraversalOptions } from "../../types/hierarchy";
import type { TreeNode } from "../../utils/hierarchy";

export type HierarchySourceType = "properties" | "moc-content";

/**
 * Strategy interface for hierarchy building.
 */
export interface HierarchyStrategy {
	buildTree(startFile: TFile, options: HierarchyTraversalOptions): TreeNode;
	buildTreeFromTopParent(startFile: TFile, options: HierarchyTraversalOptions): TreeNode;
	findChildren(filePath: string, mocFilePath?: string): string[];
	findParents(filePath: string, mocFilePath?: string): string[];
	collectRelatedNodesRecursively(
		startFile: TFile,
		relationshipType: RelationshipType,
		options: HierarchyTraversalOptions
	): Set<string>;
}
