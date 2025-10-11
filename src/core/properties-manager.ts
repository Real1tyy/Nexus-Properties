import type { App } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { getFileContext, withFileContext } from "../utils/file-context";
import { formatWikiLink, parsePropertyLinks } from "../utils/link-parser";
import { addLinkToProperty } from "../utils/property-utils";
import { getRelationshipContext, getRelationshipDiff } from "../utils/relationship-context";
import type { FileRelationships, Indexer, IndexerEvent } from "./indexer";

export class PropertiesManager {
	private subscription: Subscription | null = null;

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
			}
		});
	}

	stop(): void {
		this.subscription?.unsubscribe();
		this.subscription = null;
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
		const currentFilePath = relationships.filePath;
		const currentContext = getFileContext(this.app, currentFilePath);
		const siblings = new Set<string>();

		// Parse parent wiki links to get file paths
		const parentPaths = parsePropertyLinks(relationships.parent);

		// Find all siblings by looking at each parent's children
		for (const parentPath of parentPaths) {
			const parentContext = getFileContext(this.app, parentPath);
			if (!parentContext.file || !parentContext.frontmatter) {
				continue;
			}

			// Get all children of this parent
			const childrenLinks = parsePropertyLinks(parentContext.frontmatter[this.settings.childrenProp]);

			for (const childLink of childrenLinks) {
				const childContext = getFileContext(this.app, childLink);
				// Exclude self from siblings
				if (childContext.pathWithExt !== currentFilePath) {
					siblings.add(childContext.pathWithExt);
				}
			}
		}

		// Add siblings to current file's related property
		for (const siblingPath of siblings) {
			await this.addToProperty(currentFilePath, this.settings.relatedProp, siblingPath);
		}

		// Add current file to each sibling's related property
		for (const siblingPath of siblings) {
			await this.addToProperty(siblingPath, this.settings.relatedProp, currentContext.baseName);
		}
	}

	private async updateSiblingRelationships(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		const currentContext = getFileContext(this.app, filePath);

		// Get old and new siblings
		const oldSiblings = await this.getSiblings(oldRelationships);
		const newSiblings = await this.getSiblings(newRelationships);

		// Find siblings that were removed (no longer share a parent)
		const removedSiblings = oldSiblings.filter((s) => !newSiblings.includes(s));

		// Find siblings that were added (now share a parent)
		const addedSiblings = newSiblings.filter((s) => !oldSiblings.includes(s));

		// Remove current file from old siblings' related property
		for (const siblingPath of removedSiblings) {
			await this.removeFromProperty(siblingPath, this.settings.relatedProp, currentContext.baseName);
			await this.removeFromProperty(filePath, this.settings.relatedProp, siblingPath);
		}

		// Add current file to new siblings' related property
		for (const siblingPath of addedSiblings) {
			await this.addToProperty(siblingPath, this.settings.relatedProp, currentContext.baseName);
			await this.addToProperty(filePath, this.settings.relatedProp, siblingPath);
		}
	}

	private async getSiblings(relationships: FileRelationships): Promise<string[]> {
		const siblings = new Set<string>();

		// Parse parent wiki links to get file paths
		const parentPaths = parsePropertyLinks(relationships.parent);

		// Find all siblings by looking at each parent's children
		for (const parentPath of parentPaths) {
			const parentContext = getFileContext(this.app, parentPath);

			if (!parentContext.file) {
				continue;
			}

			// Get fresh frontmatter from metadata cache instead of using cached context
			const freshFrontmatter = this.app.metadataCache.getFileCache(parentContext.file)?.frontmatter;
			if (!freshFrontmatter) {
				continue;
			}

			// Get all children of this parent
			const childrenLinks = parsePropertyLinks(freshFrontmatter[this.settings.childrenProp]);

			for (const childLink of childrenLinks) {
				const childContext = getFileContext(this.app, childLink);
				// Exclude self from siblings
				if (childContext.pathWithExt !== relationships.filePath) {
					siblings.add(childContext.pathWithExt);
				}
			}
		}

		return Array.from(siblings);
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
}
