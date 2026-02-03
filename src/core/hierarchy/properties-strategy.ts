import { getFileContext, parseWikiLink } from "@real1ty-obsidian-plugins";
import { type App, TFile } from "obsidian";
import type { Indexer } from "../indexer";
import type { NexusPropertiesSettings } from "../../types/settings";
import type { RelationshipType } from "../../types/constants";
import {
	buildHierarchyTree,
	buildHierarchyTreeFromTopParent,
	collectRelatedNodesRecursively,
	type TreeNode,
} from "../../utils/hierarchy";
import type { HierarchyStrategy, HierarchyTraversalOptions } from "./hierarchy-strategy";

/**
 * Properties-based hierarchy strategy.
 * Uses frontmatter properties (Parent, Child, Related) to build hierarchy.
 */
export class PropertiesStrategy implements HierarchyStrategy {
	constructor(
		private app: App,
		private indexer: Indexer,
		private getSettings: () => NexusPropertiesSettings
	) {}

	buildTree(startFile: TFile, options: HierarchyTraversalOptions = {}): TreeNode {
		return buildHierarchyTree(this.app, this.indexer, startFile, options);
	}

	buildTreeFromTopParent(startFile: TFile, options: HierarchyTraversalOptions = {}): TreeNode {
		return buildHierarchyTreeFromTopParent(this.app, this.indexer, startFile, {
			...options,
			prioritizeParentProp: this.getSettings().prioritizeParentProp,
		});
	}

	findChildren(filePath: string): string[] {
		return this.findRelationships(filePath, "children");
	}

	findParents(filePath: string): string[] {
		return this.findRelationships(filePath, "parent");
	}

	private findRelationships(filePath: string, relationshipType: "parent" | "children"): string[] {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return [];

		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) return [];

		const relationships = this.indexer.extractRelationships(file, frontmatter);
		return relationships[relationshipType]
			.map((wikiLink) => {
				const linkPath = parseWikiLink(wikiLink);
				if (!linkPath) return undefined;
				const context = getFileContext(this.app, linkPath, { sourcePath: filePath });
				return context.file?.path;
			})
			.filter((path): path is string => path !== undefined);
	}

	collectRelatedNodesRecursively(
		startFile: TFile,
		relationshipType: RelationshipType,
		options: HierarchyTraversalOptions = {}
	): Set<string> {
		return collectRelatedNodesRecursively(this.app, this.indexer, startFile, relationshipType, options);
	}
}
