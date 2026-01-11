import {
	addLinkToProperty,
	applyFrontmatterChanges,
	type FrontmatterChange,
	type FrontmatterDiff,
	FrontmatterPropagationModal,
	formatWikiLink,
	getFileContext,
	mergeFrontmatterDiffs,
	parsePropertyLinks,
	withFileContext,
} from "@real1ty-obsidian-plugins/utils";
import type { App } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { parseExcludedProps } from "../utils/frontmatter-utils";
import { getChildrenRecursively } from "../utils/hierarchy";
import { getRelationshipContext, getRelationshipDiff } from "../utils/relationship-context";
import type { FileRelationships, Indexer, IndexerEvent } from "./indexer";

export class PropertiesManager {
	private subscription: Subscription | null = null;
	private propagationDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
	private accumulatedDiffs: Map<string, FrontmatterDiff[]> = new Map();
	private filesBeingPropagated: Set<string> = new Set();

	constructor(
		private app: App,
		private settings: NexusPropertiesSettings
	) {}

	start(events$: Observable<IndexerEvent>): void {
		this.subscription = events$.subscribe((event) => {
			if (event.type === "file-deleted" && event.oldRelationships) {
				this.handleFileDeletion(event.filePath, event.oldRelationships);
			} else if (event.type === "file-changed" && event.oldRelationships && event.newRelationships) {
				this.handleFileModification(event.filePath, event.oldRelationships, event.newRelationships);

				if (!this.filesBeingPropagated.has(event.filePath)) {
					this.handleFrontmatterPropagation(event.filePath, event.newRelationships, event.frontmatterDiff);
				}
			}
		});
	}

	stop(): void {
		this.subscription?.unsubscribe();
		this.subscription = null;

		// Clear all debounce timers
		for (const timer of this.propagationDebounceTimers.values()) {
			clearTimeout(timer);
		}
		this.propagationDebounceTimers.clear();
		this.accumulatedDiffs.clear();
		this.filesBeingPropagated.clear();
	}

	async rescanAndAssignPropertiesForAllFiles(indexer: Indexer): Promise<void> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => indexer.shouldIndexFile(file.path));

		if (this.settings.autoLinkSiblings) {
			await Promise.all(
				relevantFiles.map(async (file) => {
					const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
					if (!frontmatter) {
						return;
					}

					const relationships = indexer.extractRelationships(file, frontmatter);
					await this.linkSiblingsIfNeeded(relationships);
				})
			);
		}
	}

	private async linkSiblingsIfNeeded(relationships: FileRelationships): Promise<void> {
		const currentContext = getFileContext(this.app, relationships.filePath);
		const siblings = this.getSiblings(relationships);

		for (const siblingPath of siblings) {
			await this.addToProperty(relationships.filePath, this.settings.relatedProp, siblingPath);
			await this.addToProperty(siblingPath, this.settings.relatedProp, currentContext.baseName);
		}
	}

	private async updateSiblingRelationships(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		const currentContext = getFileContext(this.app, filePath);

		const oldSiblings = this.getSiblings(oldRelationships);
		const newSiblings = this.getSiblings(newRelationships);
		const oldSet = new Set(oldSiblings);
		const newSet = new Set(newSiblings);

		const removedSiblings = oldSiblings.filter((s) => !newSet.has(s));
		const addedSiblings = newSiblings.filter((s) => !oldSet.has(s));

		for (const siblingPath of removedSiblings) {
			await this.removeFromProperty(siblingPath, this.settings.relatedProp, currentContext.baseName);
			await this.removeFromProperty(filePath, this.settings.relatedProp, siblingPath);
		}

		for (const siblingPath of addedSiblings) {
			await this.addToProperty(siblingPath, this.settings.relatedProp, currentContext.baseName);
			await this.addToProperty(filePath, this.settings.relatedProp, siblingPath);
		}
	}

	private getSiblings(relationships: FileRelationships): string[] {
		const parentPaths = parsePropertyLinks(relationships.parent);

		const allSiblings = parentPaths
			.map((parentPath) => getFileContext(this.app, parentPath))
			.filter((parentContext) => parentContext.file)
			.flatMap((parentContext) => {
				const freshFrontmatter = this.app.metadataCache.getFileCache(parentContext.file!)?.frontmatter;
				if (!freshFrontmatter) return [];

				return parsePropertyLinks(freshFrontmatter[this.settings.childrenProp]);
			})
			.map((childLink) => getFileContext(this.app, childLink).pathWithExt)
			.filter((path) => path !== relationships.filePath);

		return [...new Set(allSiblings)];
	}

	private async addToProperty(targetFilePath: string, propertyName: string, fileToAdd: string): Promise<void> {
		const fileToAddContext = getFileContext(this.app, fileToAdd);

		await withFileContext(this.app, targetFilePath, async (target) => {
			await this.app.fileManager.processFrontMatter(target.file!, (fm) => {
				const currentValue = fm[propertyName];
				fm[propertyName] = addLinkToProperty(currentValue, fileToAddContext.baseName);
			});
		});
	}

	private async handleFileDeletion(deletedFilePath: string, oldRelationships: FileRelationships): Promise<void> {
		const deletedContext = getFileContext(this.app, deletedFilePath);

		for (const config of RELATIONSHIP_CONFIGS) {
			const ctx = getRelationshipContext(config, oldRelationships, this.settings);

			for (const referencedFilePath of ctx.paths) {
				await this.removeFromProperty(referencedFilePath, ctx.reversePropName, deletedContext.baseName);
			}
		}
	}

	private async handleFileModification(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		const currentContext = getFileContext(this.app, filePath);

		for (const config of RELATIONSHIP_CONFIGS) {
			const diff = getRelationshipDiff(config, oldRelationships, newRelationships, this.settings);

			for (const addedLink of diff.addedLinks) {
				await this.addToProperty(addedLink, diff.reversePropName, currentContext.baseName);
			}

			for (const removedLink of diff.removedLinks) {
				await this.removeFromProperty(removedLink, diff.reversePropName, currentContext.baseName);
			}
		}

		if (this.settings.autoLinkSiblings) {
			await this.updateSiblingRelationships(filePath, oldRelationships, newRelationships);
		}
	}

	private async removeFromProperty(targetFilePath: string, propertyName: string, fileToRemove: string): Promise<void> {
		const fileToRemoveContext = getFileContext(this.app, fileToRemove);

		await withFileContext(this.app, targetFilePath, async (target) => {
			await this.app.fileManager.processFrontMatter(target.file!, (fm) => {
				const currentValue = fm[propertyName];

				if (!currentValue) {
					return;
				}

				const links = parsePropertyLinks(currentValue);
				const filteredLinks = links.filter((link) => {
					const linkContext = getFileContext(this.app, link);
					return linkContext.baseName !== fileToRemoveContext.baseName;
				});

				fm[propertyName] = filteredLinks.map((path) => formatWikiLink(path));
			});
		});
	}

	private handleFrontmatterPropagation(
		filePath: string,
		relationships: FileRelationships,
		frontmatterDiff?: FrontmatterDiff
	): void {
		if (
			(!this.settings.propagateFrontmatterToChildren && !this.settings.askBeforePropagatingFrontmatter) ||
			!frontmatterDiff?.hasChanges
		) {
			return;
		}

		const childrenPaths = getChildrenRecursively(this.app, relationships, this.settings);
		if (childrenPaths.length === 0) {
			return;
		}

		const existingTimer = this.propagationDebounceTimers.get(filePath);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const existingDiffs = this.accumulatedDiffs.get(filePath) || [];
		existingDiffs.push(frontmatterDiff);
		this.accumulatedDiffs.set(filePath, existingDiffs);

		const timer = setTimeout(() => {
			this.propagationDebounceTimers.delete(filePath);
			const diffs = this.accumulatedDiffs.get(filePath) || [];
			this.accumulatedDiffs.delete(filePath);

			const mergedDiff = mergeFrontmatterDiffs(diffs);

			if (this.settings.propagateFrontmatterToChildren) {
				void this.propagateFrontmatterToChildren(childrenPaths, relationships, mergedDiff);
			} else if (this.settings.askBeforePropagatingFrontmatter) {
				const fileContext = getFileContext(this.app, filePath);
				new FrontmatterPropagationModal(this.app, {
					eventTitle: fileContext.baseName,
					diff: mergedDiff,
					instanceCount: childrenPaths.length,
					onConfirm: () => this.propagateFrontmatterToChildren(childrenPaths, relationships, mergedDiff),
				}).open();
			}
		}, this.settings.propagationDebounceMs);

		this.propagationDebounceTimers.set(filePath, timer);
	}

	private async propagateFrontmatterToChildren(
		childrenPaths: string[],
		relationships: FileRelationships,
		frontmatterDiff: FrontmatterDiff
	): Promise<void> {
		if (childrenPaths.length === 0) {
			return;
		}

		const allChanges = [...frontmatterDiff.added, ...frontmatterDiff.modified, ...frontmatterDiff.deleted];
		if (allChanges.length === 0) {
			return;
		}

		const excludedProps = parseExcludedProps(this.settings);

		// Filter changes to only include non-excluded properties
		const filteredAdded = frontmatterDiff.added.filter((change: FrontmatterChange) => !excludedProps.has(change.key));
		const filteredModified = frontmatterDiff.modified.filter(
			(change: FrontmatterChange) => !excludedProps.has(change.key)
		);
		const filteredDeleted = frontmatterDiff.deleted.filter(
			(change: FrontmatterChange) => !excludedProps.has(change.key)
		);

		if (filteredAdded.length === 0 && filteredModified.length === 0 && filteredDeleted.length === 0) {
			return;
		}

		for (const childPath of childrenPaths) {
			this.filesBeingPropagated.add(childPath);
		}

		try {
			const filteredChanges = [...filteredAdded, ...filteredModified, ...filteredDeleted];
			await Promise.all(
				childrenPaths.map((childPath) =>
					applyFrontmatterChanges(this.app, childPath, relationships.frontmatter, {
						added: filteredAdded,
						modified: filteredModified,
						deleted: filteredDeleted,
						changes: filteredChanges,
						hasChanges: filteredChanges.length > 0,
					})
				)
			);
		} finally {
			for (const childPath of childrenPaths) {
				this.filesBeingPropagated.delete(childPath);
			}
		}
	}
}
