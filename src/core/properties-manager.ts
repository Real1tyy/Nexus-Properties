import {
	addLinkToProperty,
	applyFrontmatterChanges,
	extractDisplayName,
	type FrontmatterChange,
	type FrontmatterDiff,
	FrontmatterPropagationModal,
	formatWikiLink,
	getFileContext,
	mergeFrontmatterDiffs,
	parsePropertyLinks,
	withFileContext,
} from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { parseExcludedProps } from "../utils/frontmatter-utils";
import { getChildrenRecursively } from "../utils/hierarchy";
import { stripParentPrefix } from "../utils/string-utils";
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
			} else if (event.type === "file-changed" && event.newRelationships) {
				if (event.oldRelationships) {
					this.handleFileModification(event.filePath, event.oldRelationships, event.newRelationships);
				}

				if (!this.filesBeingPropagated.has(event.filePath)) {
					void this.updateTitleProperty(event.filePath, event.newRelationships);
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

		await Promise.all(
			relevantFiles.map(async (file) => {
				const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!frontmatter) {
					return;
				}

				const relationships = indexer.extractRelationships(file, frontmatter);

				if (this.settings.autoLinkSiblings) {
					await this.linkSiblingsIfNeeded(relationships);
				}

				await this.updateTitleProperty(file.path, relationships);
			})
		);
	}

	private computeTitle(baseName: string, parentWikiLinks: string[]): string {
		if (!parentWikiLinks.length) {
			return baseName;
		}
		const firstParentLink = parentWikiLinks[0];
		const parentDisplayName = extractDisplayName(firstParentLink);
		return stripParentPrefix(baseName, parentDisplayName);
	}

	private async updateTitleProperty(filePath: string, newRelationships: FileRelationships): Promise<void> {
		const context = getFileContext(this.app, filePath);
		if (!context.file) return;

		const displayName = extractDisplayName(filePath);
		const computedTitle = this.computeTitle(displayName, newRelationships.parent);

		const pathWithoutExt = filePath.replace(/\.md$/, "");
		const titleLink = `[[${pathWithoutExt}|${computedTitle}]]`;

		const currentTitle = newRelationships.frontmatter[this.settings.titleProp];
		if (currentTitle === titleLink) return;

		await this.app.fileManager.processFrontMatter(context.file, (fm) => {
			fm[this.settings.titleProp] = titleLink;
		});
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
		const parentLinks = parsePropertyLinks(relationships.parent);

		return [
			...new Set(
				parentLinks
					.map((parentLink) => getFileContext(this.app, parentLink, { sourcePath: relationships.filePath }))
					.filter((parentContext) => parentContext.file)
					.flatMap((parentContext) => {
						const freshFrontmatter = this.app.metadataCache.getFileCache(parentContext.file!)?.frontmatter;
						if (!freshFrontmatter) return [];
						return parsePropertyLinks(freshFrontmatter[this.settings.childrenProp]);
					})
					.map((childLink) => getFileContext(this.app, childLink, { sourcePath: relationships.filePath }))
					.filter((childContext) => childContext.file)
					.map((childContext) => childContext.pathWithExt)
					.filter((path) => path !== relationships.filePath)
			),
		];
	}

	private async addToProperty(targetFilePath: string, propertyName: string, fileToAdd: string): Promise<void> {
		const fileToAddContext = getFileContext(this.app, fileToAdd);

		await withFileContext(this.app, targetFilePath, async (target) => {
			if (!target.file) return;

			await this.app.fileManager.processFrontMatter(target.file, (fm) => {
				const currentValue = fm[propertyName];
				// Use full path (without extension) for consistent link formatting and duplicate detection
				const linkPath = fileToAddContext.pathWithExt.replace(/\.md$/, "");
				fm[propertyName] = addLinkToProperty(currentValue, linkPath);
			});
		});
	}

	private async handleFileDeletion(deletedFilePath: string, oldRelationships: FileRelationships): Promise<void> {
		const deletedContext = getFileContext(this.app, deletedFilePath);

		for (const config of RELATIONSHIP_CONFIGS) {
			const ctx = getRelationshipContext(config, oldRelationships, this.settings);

			for (const referencedLink of ctx.paths) {
				// Use sourcePath for proper link resolution
				const targetContext = getFileContext(this.app, referencedLink, { sourcePath: deletedFilePath });
				if (!targetContext.file) {
					// File doesn't exist - nothing to remove from
					continue;
				}
				await this.removeFromProperty(targetContext.pathWithExt, ctx.reversePropName, deletedContext.baseName);
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
				// Use sourcePath for proper link resolution (handles files in subfolders)
				const targetContext = getFileContext(this.app, addedLink, { sourcePath: filePath });
				if (!targetContext.file) {
					// File doesn't exist yet - skip silently
					// The relationship will be established when the file is created
					continue;
				}
				await this.addToProperty(targetContext.pathWithExt, diff.reversePropName, currentContext.baseName);
			}

			for (const removedLink of diff.removedLinks) {
				// Use sourcePath for proper link resolution
				const targetContext = getFileContext(this.app, removedLink, { sourcePath: filePath });
				if (!targetContext.file) {
					// File doesn't exist - nothing to remove from
					continue;
				}
				await this.removeFromProperty(targetContext.pathWithExt, diff.reversePropName, currentContext.baseName);
			}
		}

		if (this.settings.autoLinkSiblings) {
			await this.updateSiblingRelationships(filePath, oldRelationships, newRelationships);
		}
	}

	private async removeFromProperty(targetFilePath: string, propertyName: string, fileToRemove: string): Promise<void> {
		const fileToRemoveContext = getFileContext(this.app, fileToRemove);

		await withFileContext(this.app, targetFilePath, async (target) => {
			if (!target.file) return;

			await this.app.fileManager.processFrontMatter(target.file, (fm) => {
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
