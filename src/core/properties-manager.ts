import {
	addLinkToProperty,
	applyFrontmatterChanges,
	extractDisplayName,
	formatWikiLink,
	type FrontmatterChange,
	type FrontmatterDiff,
	getFileContext,
	mergeFrontmatterDiffs,
	parsePropertyLinks,
	removeMarkdownExtension,
	showFrontmatterPropagationModal,
	withFileContext,
} from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";
import type { BehaviorSubject, Observable, Subscription } from "rxjs";

import type { FileRelationships } from "../types/constants";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { parseExcludedProps } from "../utils/frontmatter-utils";
import { getChildrenRecursively } from "../utils/hierarchy";
import { getRelationshipContext, getRelationshipDiff } from "../utils/relationship-context";
import { buildTitleLink, replaceParentPrefix } from "../utils/string-utils";
import type { Indexer, IndexerEvent } from "./indexer";

export class PropertiesManager {
	private subscription: Subscription | null = null;
	private settingsSubscription: Subscription | null = null;
	private propagationDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
	private accumulatedDiffs: Map<string, FrontmatterDiff[]> = new Map();
	private filesBeingPropagated: Set<string> = new Set();
	private cachedExcludedDirs: string[] = [];
	private settings: NexusPropertiesSettings;

	constructor(
		private app: App,
		settingsStore: BehaviorSubject<NexusPropertiesSettings>
	) {
		this.settings = settingsStore.value;
		this.updateExcludedDirsCache();

		this.settingsSubscription = settingsStore.subscribe((newSettings) => {
			this.settings = newSettings;
			this.updateExcludedDirsCache();
		});
	}

	start(events$: Observable<IndexerEvent>): void {
		this.subscription = events$.subscribe((event) => {
			if (event.type === "file-deleted" && event.oldRelationships) {
				void this.handleFileDeletion(event.filePath, event.oldRelationships);
			} else if (event.type === "file-renamed" && event.oldPath && event.newRelationships) {
				void this.handleFileRename(event.filePath, event.oldPath, event.newRelationships);
			} else if (event.type === "file-changed" && event.newRelationships) {
				if (event.oldRelationships) {
					void this.handleFileModification(event.filePath, event.oldRelationships, event.newRelationships);
				}

				if (this.filesBeingPropagated.has(event.filePath)) {
					// Consume the flag: this child was just propagated to,
					// so skip its propagation check exactly once.
					this.filesBeingPropagated.delete(event.filePath);
				} else {
					void this.updateTitleProperty(event.filePath, event.newRelationships);
					this.handleFrontmatterPropagation(event.filePath, event.newRelationships, event.frontmatterDiff);
				}
			}
		});
	}

	stop(): void {
		this.subscription?.unsubscribe();
		this.subscription = null;
		this.settingsSubscription?.unsubscribe();
		this.settingsSubscription = null;

		// Clear all debounce timers
		for (const timer of this.propagationDebounceTimers.values()) {
			clearTimeout(timer);
		}
		this.propagationDebounceTimers.clear();
		this.accumulatedDiffs.clear();
		this.filesBeingPropagated.clear();
	}

	private async handleFileRename(newPath: string, oldPath: string, newRelationships: FileRelationships): Promise<void> {
		if (!this.settings.propagateRenameToChildren) return;

		const oldDisplayName = extractDisplayName(oldPath);
		const newDisplayName = extractDisplayName(newPath);

		if (oldDisplayName === newDisplayName) return;

		const childLinks = parsePropertyLinks(newRelationships.children);
		if (childLinks.length === 0) return;

		for (const childLink of childLinks) {
			const childContext = getFileContext(this.app, childLink, { sourcePath: newPath });
			if (!childContext.file) continue;

			const childDisplayName = extractDisplayName(childContext.file.path);
			const newChildName = replaceParentPrefix(childDisplayName, oldDisplayName, newDisplayName);
			if (!newChildName) continue;

			// Preserve the child's folder, only change the filename
			const folder = childContext.file.parent?.path ?? "";
			const newChildPath = folder ? `${folder}/${newChildName}.md` : `${newChildName}.md`;

			await this.app.vault.rename(childContext.file, newChildPath);
		}
	}

	async rescanAndAssignPropertiesForAllFiles(indexer: Indexer): Promise<void> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => indexer.shouldIndexFile(file.path));

		// Process in batches to avoid overwhelming the system
		const BATCH_SIZE = 50;
		for (let i = 0; i < relevantFiles.length; i += BATCH_SIZE) {
			const batch = relevantFiles.slice(i, i + BATCH_SIZE);
			await Promise.all(
				batch.map(async (file) => {
					const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
					if (!frontmatter) return;

					const relationships = indexer.extractRelationships(file, frontmatter);

					if (this.settings.autoLinkSiblings) {
						await this.linkSiblingsIfNeeded(relationships);
					}

					await this.updateTitleProperty(file.path, relationships);
				})
			);
		}
	}

	private updateExcludedDirsCache(): void {
		this.cachedExcludedDirs = this.settings.excludeTitleDirectories
			.split(",")
			.map((dir) => dir.trim())
			.filter((dir) => dir.length > 0);
	}

	private isExcludedFromTitle(filePath: string): boolean {
		return this.cachedExcludedDirs.some((dir) => filePath.startsWith(dir + "/") || filePath.startsWith(dir));
	}

	private async updateTitleProperty(filePath: string, newRelationships: FileRelationships): Promise<void> {
		if (this.settings.titlePropertyMode !== "enabled") return;
		if (this.isExcludedFromTitle(filePath)) return;

		const titleLink = buildTitleLink(filePath, newRelationships.parent);

		const currentTitle = newRelationships.frontmatter[this.settings.titleProp];
		if (currentTitle === titleLink) return;

		const context = getFileContext(this.app, filePath);
		if (!context.file) return;

		await this.app.fileManager.processFrontMatter(context.file, (fm) => {
			fm[this.settings.titleProp] = titleLink;
		});
	}

	private async linkSiblingsIfNeeded(relationships: FileRelationships): Promise<void> {
		const siblings = this.getSiblings(relationships);

		for (const siblingPath of siblings) {
			await this.addToProperty(relationships.filePath, this.settings.relatedProp, siblingPath);
			await this.addToProperty(siblingPath, this.settings.relatedProp, relationships.filePath);
		}
	}

	private async updateSiblingRelationships(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		const oldSiblings = this.getSiblings(oldRelationships);
		const newSiblings = this.getSiblings(newRelationships);
		const oldSet = new Set(oldSiblings);
		const newSet = new Set(newSiblings);

		const removedSiblings = oldSiblings.filter((s) => !newSet.has(s));
		const addedSiblings = newSiblings.filter((s) => !oldSet.has(s));

		for (const siblingPath of removedSiblings) {
			await this.removeFromProperty(siblingPath, this.settings.relatedProp, filePath);
			await this.removeFromProperty(filePath, this.settings.relatedProp, siblingPath);
		}

		for (const siblingPath of addedSiblings) {
			await this.addToProperty(siblingPath, this.settings.relatedProp, filePath);
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
				const linkPath = removeMarkdownExtension(fileToAddContext.pathWithExt);
				fm[propertyName] = addLinkToProperty(currentValue, linkPath);
			});
		});
	}

	private async handleFileDeletion(deletedFilePath: string, oldRelationships: FileRelationships): Promise<void> {
		for (const config of RELATIONSHIP_CONFIGS) {
			const ctx = getRelationshipContext(config, oldRelationships, this.settings);

			for (const referencedLink of ctx.paths) {
				// Use sourcePath for proper link resolution
				const targetContext = getFileContext(this.app, referencedLink, { sourcePath: deletedFilePath });
				if (!targetContext.file) {
					// File doesn't exist - nothing to remove from
					continue;
				}
				await this.removeFromProperty(targetContext.pathWithExt, ctx.reversePropName, deletedFilePath);
			}
		}
	}

	private async handleFileModification(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
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
				await this.addToProperty(targetContext.pathWithExt, diff.reversePropName, filePath);
			}

			for (const removedLink of diff.removedLinks) {
				// Use sourcePath for proper link resolution
				const targetContext = getFileContext(this.app, removedLink, { sourcePath: filePath });
				if (!targetContext.file) {
					// File doesn't exist - nothing to remove from
					continue;
				}
				await this.removeFromProperty(targetContext.pathWithExt, diff.reversePropName, filePath);
			}
		}

		if (this.settings.autoLinkSiblings) {
			await this.updateSiblingRelationships(filePath, oldRelationships, newRelationships);
		}
	}

	private async removeFromProperty(targetFilePath: string, propertyName: string, fileToRemove: string): Promise<void> {
		const fileToRemoveContext = getFileContext(this.app, fileToRemove);
		const fileToRemovePath = removeMarkdownExtension(fileToRemoveContext.pathWithExt);

		await withFileContext(this.app, targetFilePath, async (target) => {
			if (!target.file) return;

			await this.app.fileManager.processFrontMatter(target.file, (fm) => {
				const currentValue = fm[propertyName];

				if (!currentValue) {
					return;
				}

				const links = parsePropertyLinks(currentValue);
				const filteredLinks = links.filter((link) => {
					// Use sourcePath for proper link resolution
					const linkContext = getFileContext(this.app, link, { sourcePath: targetFilePath });
					const linkPath = removeMarkdownExtension(linkContext.pathWithExt);
					return linkPath !== fileToRemovePath;
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
			const filteredDiff = this.filterExcludedProperties(mergedDiff);
			if (!filteredDiff.hasChanges) return;

			if (this.settings.propagateFrontmatterToChildren) {
				void this.propagateFrontmatterToChildren(childrenPaths, relationships, filteredDiff);
			} else if (this.settings.askBeforePropagatingFrontmatter) {
				const fileContext = getFileContext(this.app, filePath);
				showFrontmatterPropagationModal(this.app, {
					eventTitle: fileContext.baseName,
					diff: filteredDiff,
					instanceCount: childrenPaths.length,
					onConfirm: () => this.propagateFrontmatterToChildren(childrenPaths, relationships, filteredDiff),
				});
			}
		}, this.settings.propagationDebounceMs);

		this.propagationDebounceTimers.set(filePath, timer);
	}

	private async propagateFrontmatterToChildren(
		childrenPaths: string[],
		relationships: FileRelationships,
		frontmatterDiff: FrontmatterDiff
	): Promise<void> {
		if (childrenPaths.length === 0 || !frontmatterDiff.hasChanges) {
			return;
		}

		for (const childPath of childrenPaths) {
			this.filesBeingPropagated.add(childPath);
		}

		try {
			await Promise.all(
				childrenPaths.map((childPath) =>
					applyFrontmatterChanges(this.app, childPath, relationships.frontmatter, frontmatterDiff)
				)
			);
		} catch {
			// If propagation fails, remove flags so future edits aren't blocked.
			// On success, flags are consumed by the event handler in start().
			for (const childPath of childrenPaths) {
				this.filesBeingPropagated.delete(childPath);
			}
		}
	}

	private filterExcludedProperties(diff: FrontmatterDiff): FrontmatterDiff {
		const excludedProps = parseExcludedProps(this.settings);
		const isAllowed = (change: FrontmatterChange) => !excludedProps.has(change.key);

		const added = diff.added.filter(isAllowed);
		const modified = diff.modified.filter(isAllowed);
		const deleted = diff.deleted.filter(isAllowed);
		const changes = [...added, ...modified, ...deleted];

		return { added, modified, deleted, changes, hasChanges: changes.length > 0 };
	}
}
