import type { App, CachedMetadata, TFile } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { ensureMarkdownExtension, getFileByPath, removeMarkdownExtension } from "../utils/file-utils";
import { formatWikiLink, parsePropertyLinks } from "../utils/link-parser";
import { normalizeProperty } from "../utils/property-normalizer";
import { addLinkToProperty } from "../utils/property-utils";
import type { FileRelationships, Indexer, IndexerEvent } from "./indexer";

interface FileContext {
	path: string;
	pathWithExt: string;
	baseName: string;
	file: TFile | null;
	frontmatter: Record<string, any> | undefined;
	cache: CachedMetadata | null;
}

export class PropertiesManager {
	private subscription: Subscription | null = null;

	constructor(
		private app: App,
		private settings: NexusPropertiesSettings
	) {}

	private getFileContext(path: string): FileContext {
		const pathWithExt = ensureMarkdownExtension(path);
		const baseName = removeMarkdownExtension(path);
		const file = getFileByPath(this.app, pathWithExt);
		const cache = file ? this.app.metadataCache.getFileCache(file) : null;
		const frontmatter = cache?.frontmatter;

		return {
			path,
			pathWithExt,
			baseName,
			file,
			frontmatter,
			cache,
		};
	}

	private async withFileContext<T>(
		path: string,
		callback: (context: FileContext) => Promise<T> | T
	): Promise<T | null> {
		const context = this.getFileContext(path);
		if (!context.file) {
			console.warn(`PropertiesManager: File not found: ${context.pathWithExt}`);
			return null;
		}
		return await callback(context);
	}

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

		await Promise.all(
			relevantFiles.map(async (file) => {
				const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!frontmatter) {
					return;
				}

				const relationships = indexer.extractRelationships(file, frontmatter);
				await this.syncRelationships(relationships);
			})
		);
	}

	private async syncRelationships(relationships: FileRelationships): Promise<void> {
		const currentFilePath = relationships.filePath;
		const { frontmatter } = relationships;

		const computedRelationships = new Map<string, string[]>();
		const propsToDelete = new Set<string>();

		for (const config of RELATIONSHIP_CONFIGS) {
			const rawLinks = relationships[config.type];
			const propName = config.getProp(this.settings);
			const allPropName = config.getAllProp(this.settings);

			const isPropertyDefined = propName in frontmatter;

			if (isPropertyDefined) {
				const paths = parsePropertyLinks(rawLinks);
				const allItems = await this.computeAllItems(paths, propName, currentFilePath);
				computedRelationships.set(allPropName, allItems);
			} else {
				propsToDelete.add(allPropName);
			}
		}

		await this.withFileContext(currentFilePath, async (context) => {
			await this.app.fileManager.processFrontMatter(context.file!, (fm) => {
				for (const [allPropName, paths] of computedRelationships) {
					fm[allPropName] = paths.map((path) => formatWikiLink(this.getFileContext(path).baseName));
				}

				for (const propName of propsToDelete) {
					delete fm[propName];
				}
			});
		});

		for (const config of RELATIONSHIP_CONFIGS) {
			const rawLinks = relationships[config.type];
			const reversePropName = config.getReverseProp(this.settings);

			const paths = parsePropertyLinks(rawLinks);
			for (const path of paths) {
				await this.addToProperty(path, reversePropName, currentFilePath);
			}
		}
	}

	private async computeAllItems(items: string[], propertyName: string, sourceFilePath: string): Promise<string[]> {
		const visited = new Set<string>([sourceFilePath]);
		const allItems: string[] = [];

		const collectItems = async (itemsToProcess: string[]) => {
			for (const itemPath of itemsToProcess) {
				const context = this.getFileContext(itemPath);

				if (visited.has(context.pathWithExt)) {
					continue;
				}

				visited.add(context.pathWithExt);
				allItems.push(context.pathWithExt);

				if (!context.file) {
					console.warn(`PropertiesManager: File not found: ${context.pathWithExt}`);
					continue;
				}

				if (context.frontmatter?.[propertyName]) {
					const propertyValue = context.frontmatter[propertyName];
					const nestedItems = normalizeProperty(propertyValue, propertyName);
					await collectItems(nestedItems);
				}
			}
		};
		await collectItems(items);
		return allItems;
	}

	private async addToProperty(targetFilePath: string, propertyName: string, fileToAdd: string): Promise<void> {
		const fileToAddContext = this.getFileContext(fileToAdd);

		await this.withFileContext(targetFilePath, async (target) => {
			await this.app.fileManager.processFrontMatter(target.file!, (fm) => {
				const currentValue = fm[propertyName];
				fm[propertyName] = addLinkToProperty(currentValue, fileToAddContext.baseName);
			});
		});
	}

	private async handleFileDeletion(deletedFilePath: string, oldRelationships: FileRelationships): Promise<void> {
		console.log(`🗑️ Handling deletion: ${deletedFilePath} with old relationships: ${oldRelationships}`);

		const deletedContext = this.getFileContext(deletedFilePath);

		for (const config of RELATIONSHIP_CONFIGS) {
			const reversePropName = config.getReverseProp(this.settings);
			const reverseAllPropName = config.getReverseAllProp(this.settings);

			const directPaths = parsePropertyLinks(oldRelationships[config.type]);
			const allPaths = parsePropertyLinks(oldRelationships[config.allKey]);

			for (const referencedFilePath of directPaths) {
				await this.removeFromProperty(referencedFilePath, reversePropName, deletedContext.baseName);
			}

			for (const referencedFilePath of allPaths) {
				await this.removeFromProperty(referencedFilePath, reverseAllPropName, deletedContext.baseName);
			}
		}

		console.log(`✅ Deletion handled: ${deletedFilePath}`);
	}

	private async handleFileModification(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		console.log(
			`📝 Handling modification: ${filePath} with old relationships: ${oldRelationships} and new relationships: ${newRelationships}`
		);

		const currentContext = this.getFileContext(filePath);

		// For each relationship type, detect changes and update reverse properties
		for (const config of RELATIONSHIP_CONFIGS) {
			const reversePropName = config.getReverseProp(this.settings);
			const reverseAllPropName = config.getReverseAllProp(this.settings);

			const oldPaths = parsePropertyLinks(oldRelationships[config.type]);
			const newPaths = parsePropertyLinks(newRelationships[config.type]);

			const oldLinks = new Set(oldPaths);
			const newLinks = new Set(newPaths);

			// Find added links
			const addedLinks = [...newLinks].filter((link) => !oldLinks.has(link));

			// Find removed links
			const removedLinks = [...oldLinks].filter((link) => !newLinks.has(link));

			// Add reverse property for newly added links
			for (const addedLink of addedLinks) {
				console.log(`  ➕ Adding ${reversePropName} to ${addedLink}`);
				await this.addToProperty(addedLink, reversePropName, currentContext.baseName);
			}

			// Remove reverse property for removed links
			for (const removedLink of removedLinks) {
				console.log(`  ➖ Removing ${reversePropName} from ${removedLink}`);
				await this.removeFromProperty(removedLink, reversePropName, currentContext.baseName);

				// Handle transitive cleanup: remove orphaned descendants from all_children
				await this.cleanupTransitiveRelationships(filePath, removedLink, newPaths, config, reverseAllPropName);
			}
		}

		// Update "all" properties for the modified file itself
		await this.updateAllPropertiesForFile(filePath, oldRelationships, newRelationships);

		console.log(`✅ Modification handled: ${filePath}`);
	}

	private async updateAllPropertiesForFile(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		await this.withFileContext(filePath, async (context) => {
			const computedAllProperties = new Map<string, string[]>();

			for (const config of RELATIONSHIP_CONFIGS) {
				const propName = config.getProp(this.settings);
				const allPropName = config.getAllProp(this.settings);

				const oldPaths = parsePropertyLinks(oldRelationships[config.type]);
				const newPaths = parsePropertyLinks(newRelationships[config.type]);

				const oldLinks = new Set(oldPaths);
				const newLinks = new Set(newPaths);

				const addedLinks = [...newLinks].filter((link) => !oldLinks.has(link));
				const removedLinks = [...oldLinks].filter((link) => !newLinks.has(link));

				// Check if property is still defined in frontmatter
				const isPropertyDefined = propName in newRelationships.frontmatter;

				if (!isPropertyDefined) {
					continue;
				}

				if (removedLinks.length > 0) {
					// If any links were removed, recompute the entire "all" property from scratch
					console.log(`  🔄 Recomputing ${allPropName} due to removals`);
					const allItems = await this.computeAllItems(newPaths, propName, filePath);
					computedAllProperties.set(allPropName, allItems);
				} else if (addedLinks.length > 0) {
					// If only additions, compute transitively for new links and merge with existing
					console.log(`  ➕ Incrementally updating ${allPropName} with additions`);

					const existingAllItems = parsePropertyLinks(oldRelationships[config.allKey]);
					const allItemsSet = new Set(existingAllItems);

					for (const addedLink of addedLinks) {
						const newTransitiveItems = await this.computeAllItems([addedLink], propName, filePath);
						for (const item of newTransitiveItems) {
							allItemsSet.add(item);
						}
					}

					computedAllProperties.set(allPropName, [...allItemsSet]);
				}
			}

			// Update the file's frontmatter with computed "all" properties
			if (computedAllProperties.size > 0) {
				await this.app.fileManager.processFrontMatter(context.file!, (fm) => {
					for (const [allPropName, paths] of computedAllProperties) {
						fm[allPropName] = paths.map((path) => formatWikiLink(this.getFileContext(path).baseName));
					}
				});
			}
		});
	}

	private async removeFromProperty(targetFilePath: string, propertyName: string, fileToRemove: string): Promise<void> {
		const fileToRemoveContext = this.getFileContext(fileToRemove);

		await this.withFileContext(targetFilePath, async (target) => {
			await this.app.fileManager.processFrontMatter(target.file!, (fm) => {
				const currentValue = fm[propertyName];

				if (!currentValue) {
					return;
				}

				const links = parsePropertyLinks(currentValue);
				const filteredLinks = links.filter((link) => {
					const linkContext = this.getFileContext(link);
					return linkContext.baseName !== fileToRemoveContext.baseName;
				});

				fm[propertyName] = filteredLinks.map((link) => formatWikiLink(this.getFileContext(link).baseName));
			});
		});
	}

	private async cleanupTransitiveRelationships(
		currentFilePath: string,
		removedLink: string,
		remainingLinks: string[],
		config: (typeof RELATIONSHIP_CONFIGS)[number],
		reverseAllPropName: string
	): Promise<void> {
		console.log(`  🧹 Cleaning up transitive relationships after removing ${removedLink} from ${currentFilePath}`);

		const removedContext = this.getFileContext(removedLink);
		if (!removedContext.file || !removedContext.frontmatter) {
			console.warn(`PropertiesManager: Removed file not found: ${removedContext.pathWithExt}`);
			return;
		}

		const allPropName = config.getAllProp(this.settings);
		const severedChildren = parsePropertyLinks(removedContext.frontmatter[allPropName]);

		if (severedChildren.length === 0) {
			return;
		}

		const stillReachable = new Set<string>();

		for (const remainingLink of remainingLinks) {
			const remainingContext = this.getFileContext(remainingLink);
			if (!remainingContext.file || !remainingContext.frontmatter) {
				continue;
			}

			const reachableChildren = parsePropertyLinks(remainingContext.frontmatter[allPropName]);
			for (const child of reachableChildren) {
				stillReachable.add(this.getFileContext(child).pathWithExt);
			}
		}

		const orphanedChildren = severedChildren
			.map((child) => this.getFileContext(child).pathWithExt)
			.filter((child) => !stillReachable.has(child));

		if (orphanedChildren.length === 0) {
			return;
		}

		console.log(`    🔗 Found ${orphanedChildren.length} orphaned children to clean up`);

		await this.withFileContext(currentFilePath, async (current) => {
			await this.app.fileManager.processFrontMatter(current.file!, (fm) => {
				const currentAllChildren = parsePropertyLinks(fm[allPropName]);
				const filteredChildren = currentAllChildren.filter((child) => {
					const childContext = this.getFileContext(child);
					return !orphanedChildren.includes(childContext.pathWithExt);
				});

				fm[allPropName] = filteredChildren.map((child) => formatWikiLink(this.getFileContext(child).baseName));
			});

			for (const orphanedChild of orphanedChildren) {
				console.log(`    ❌ Removing ${current.baseName} from ${reverseAllPropName} of ${orphanedChild}`);
				await this.removeFromProperty(orphanedChild, reverseAllPropName, current.baseName);
			}

			await this.propagateOrphanedChildrenUpstream(currentFilePath, orphanedChildren, config);
		});
	}

	private async propagateOrphanedChildrenUpstream(
		currentFilePath: string,
		orphanedChildren: string[],
		config: (typeof RELATIONSHIP_CONFIGS)[number]
	): Promise<void> {
		if (orphanedChildren.length === 0) {
			return;
		}

		console.log(`    ⬆️ Propagating orphaned children removal upstream from ${currentFilePath}`);

		const currentContext = this.getFileContext(currentFilePath);
		if (!currentContext.file || !currentContext.frontmatter) {
			return;
		}

		const reversePropName = config.getReverseProp(this.settings);
		const reverseAllPropName = config.getReverseAllProp(this.settings);
		const allPropName = config.getAllProp(this.settings);

		const parentPaths = parsePropertyLinks(currentContext.frontmatter[reversePropName]);

		if (parentPaths.length === 0) {
			return;
		}

		for (const parentPath of parentPaths) {
			const parentContext = this.getFileContext(parentPath);

			if (!parentContext.file || !parentContext.frontmatter) {
				continue;
			}

			const parentAllChildren = parsePropertyLinks(parentContext.frontmatter[allPropName]);
			const orphanedInParent: string[] = [];

			for (const orphanedChild of orphanedChildren) {
				const orphanedContext = this.getFileContext(orphanedChild);
				if (parentAllChildren.some((child) => this.getFileContext(child).pathWithExt === orphanedContext.pathWithExt)) {
					orphanedInParent.push(orphanedContext.pathWithExt);
				}
			}

			if (orphanedInParent.length === 0) {
				continue;
			}

			console.log(`      ⬆️ Removing ${orphanedInParent.length} orphaned children from parent ${parentPath}`);

			await this.app.fileManager.processFrontMatter(parentContext.file, (fm) => {
				const currentAllChildren = parsePropertyLinks(fm[allPropName]);
				const filteredChildren = currentAllChildren.filter((child) => {
					const childContext = this.getFileContext(child);
					return !orphanedInParent.includes(childContext.pathWithExt);
				});

				fm[allPropName] = filteredChildren.map((child) => formatWikiLink(this.getFileContext(child).baseName));
			});

			for (const orphanedChild of orphanedInParent) {
				console.log(`        ❌ Removing ${parentContext.baseName} from ${reverseAllPropName} of ${orphanedChild}`);
				await this.removeFromProperty(orphanedChild, reverseAllPropName, parentContext.baseName);
			}

			await this.propagateOrphanedChildrenUpstream(parentContext.pathWithExt, orphanedInParent, config);
		}
	}
}
