/**
 * Hierarchy Provider - Strategy Pattern Implementation
 *
 * Single provider that delegates to strategies based on hierarchy source type.
 * Strategies:
 * - Properties: frontmatter parent/child relationships
 * - MOC Content: bullet list hierarchy in markdown files
 */

import type { App, TFile } from "obsidian";
import type { Indexer } from "../indexer";
import type { SettingsStore } from "../settings-store";
import type { RelationshipType } from "../../types/constants";
import type { TreeNode } from "../../utils/hierarchy";
import { PropertiesStrategy } from "./properties-strategy";
import { MocContentStrategy } from "./moc-content-strategy";
import type { HierarchyStrategy, HierarchySourceType, HierarchyTraversalOptions } from "./hierarchy-strategy";

/**
 * Singleton Hierarchy Provider using Strategy pattern.
 * Views call methods directly, passing the hierarchy source type.
 * The provider handles MOC data loading internally.
 */
export class HierarchyProvider {
	private static instance: HierarchyProvider | null = null;

	private propertiesStrategy: PropertiesStrategy;
	private mocContentStrategy: MocContentStrategy;

	private constructor(app: App, indexer: Indexer, settingsStore: SettingsStore) {
		const getSettings = () => settingsStore.currentSettings;
		this.propertiesStrategy = new PropertiesStrategy(app, indexer, getSettings);
		this.mocContentStrategy = new MocContentStrategy(app, indexer, getSettings);
	}

	static getInstance(app: App, indexer: Indexer, settingsStore: SettingsStore): HierarchyProvider {
		if (!HierarchyProvider.instance) {
			HierarchyProvider.instance = new HierarchyProvider(app, indexer, settingsStore);
		}
		return HierarchyProvider.instance;
	}

	static resetInstance(): void {
		HierarchyProvider.instance = null;
	}

	private getStrategy(sourceType: HierarchySourceType): HierarchyStrategy {
		return sourceType === "moc-content" ? this.mocContentStrategy : this.propertiesStrategy;
	}

	private async withStrategy<T>(
		sourceType: HierarchySourceType,
		mocFilePath: string | undefined,
		operation: (strategy: HierarchyStrategy) => T | Promise<T>
	): Promise<T> {
		if (sourceType === "moc-content" && mocFilePath) {
			await this.mocContentStrategy.loadMocDataAsync(mocFilePath);
		}
		return operation(this.getStrategy(sourceType));
	}

	async buildTree(
		startFile: TFile,
		sourceType: HierarchySourceType,
		options: HierarchyTraversalOptions = {}
	): Promise<TreeNode> {
		return this.withStrategy(sourceType, options.mocFilePath, (strategy) => strategy.buildTree(startFile, options));
	}

	async buildTreeFromTopParent(
		startFile: TFile,
		sourceType: HierarchySourceType,
		options: HierarchyTraversalOptions = {}
	): Promise<TreeNode> {
		return this.withStrategy(sourceType, options.mocFilePath, (strategy) =>
			strategy.buildTreeFromTopParent(startFile, options)
		);
	}

	async findChildren(filePath: string, sourceType: HierarchySourceType, mocFilePath?: string): Promise<string[]> {
		return this.withStrategy(sourceType, mocFilePath, (strategy) => strategy.findChildren(filePath, mocFilePath));
	}

	async findParents(filePath: string, sourceType: HierarchySourceType, mocFilePath?: string): Promise<string[]> {
		return this.withStrategy(sourceType, mocFilePath, (strategy) => strategy.findParents(filePath, mocFilePath));
	}

	async collectRelatedNodesRecursively(
		startFile: TFile,
		relationshipType: RelationshipType,
		sourceType: HierarchySourceType,
		options: HierarchyTraversalOptions = {}
	): Promise<Set<string>> {
		return this.withStrategy(sourceType, options.mocFilePath, (strategy) =>
			strategy.collectRelatedNodesRecursively(startFile, relationshipType, options)
		);
	}

	clearMocCache(mocFilePath?: string): void {
		this.mocContentStrategy.clearCache(mocFilePath);
	}
}
