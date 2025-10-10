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

interface RelationshipContext {
	propName: string;
	allPropName: string;
	reversePropName: string;
	reverseAllPropName: string;
	paths: string[];
	allPaths: string[];
}

interface RelationshipDiff {
	oldPaths: string[];
	newPaths: string[];
	oldSet: Set<string>;
	newSet: Set<string>;
	addedLinks: string[];
	removedLinks: string[];
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

	private getRelationshipContext(
		config: (typeof RELATIONSHIP_CONFIGS)[number],
		relationships: FileRelationships
	): RelationshipContext {
		return {
			propName: config.getProp(this.settings),
			allPropName: config.getAllProp(this.settings),
			reversePropName: config.getReverseProp(this.settings),
			reverseAllPropName: config.getReverseAllProp(this.settings),
			paths: parsePropertyLinks(relationships[config.type]),
			allPaths: parsePropertyLinks(relationships[config.allKey]),
		};
	}

	private getRelationshipDiff(
		config: (typeof RELATIONSHIP_CONFIGS)[number],
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): RelationshipDiff & RelationshipContext {
		const oldPaths = parsePropertyLinks(oldRelationships[config.type]);
		const newPaths = parsePropertyLinks(newRelationships[config.type]);
		const oldSet = new Set(oldPaths);
		const newSet = new Set(newPaths);

		return {
			...this.getRelationshipContext(config, newRelationships),
			oldPaths,
			newPaths,
			oldSet,
			newSet,
			addedLinks: [...newSet].filter((link) => !oldSet.has(link)),
			removedLinks: [...oldSet].filter((link) => !newSet.has(link)),
		};
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
			const ctx = this.getRelationshipContext(config, relationships);
			const isPropertyDefined = ctx.propName in frontmatter;

			if (isPropertyDefined) {
				const allItems = await this.computeAllItems(ctx.paths, ctx.propName, currentFilePath);
				computedRelationships.set(ctx.allPropName, allItems);
			} else {
				propsToDelete.add(ctx.allPropName);
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
			const ctx = this.getRelationshipContext(config, relationships);
			for (const path of ctx.paths) {
				await this.addToProperty(path, ctx.reversePropName, currentFilePath);
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
		const deletedContext = this.getFileContext(deletedFilePath);

		for (const config of RELATIONSHIP_CONFIGS) {
			const ctx = this.getRelationshipContext(config, oldRelationships);

			for (const referencedFilePath of ctx.paths) {
				await this.removeFromProperty(referencedFilePath, ctx.reversePropName, deletedContext.baseName);
			}

			for (const referencedFilePath of ctx.allPaths) {
				await this.removeFromProperty(referencedFilePath, ctx.reverseAllPropName, deletedContext.baseName);
			}
		}
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

		for (const config of RELATIONSHIP_CONFIGS) {
			const diff = this.getRelationshipDiff(config, oldRelationships, newRelationships);

			for (const addedLink of diff.addedLinks) {
				await this.addToProperty(addedLink, diff.reversePropName, currentContext.baseName);
			}

			for (const removedLink of diff.removedLinks) {
				await this.removeFromProperty(removedLink, diff.reversePropName, currentContext.baseName);
				await this.cleanupTransitiveRelationships(
					filePath,
					removedLink,
					diff.newPaths,
					config,
					diff.reverseAllPropName
				);
			}
		}
		await this.updateAllPropertiesForFile(filePath, oldRelationships, newRelationships);
	}

	private async updateAllPropertiesForFile(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		await this.withFileContext(filePath, async (context) => {
			const computedAllProperties = new Map<string, string[]>();

			for (const config of RELATIONSHIP_CONFIGS) {
				const diff = this.getRelationshipDiff(config, oldRelationships, newRelationships);

				const isPropertyDefined = diff.propName in newRelationships.frontmatter;

				if (!isPropertyDefined) {
					continue;
				}

				if (diff.removedLinks.length > 0) {
					// If any links were removed, recompute the entire "all" property from scratch
					const allItems = await this.computeAllItems(diff.newPaths, diff.propName, filePath);
					computedAllProperties.set(diff.allPropName, allItems);
				} else if (diff.addedLinks.length > 0) {
					// If only additions, compute transitively for new links and merge with existing
					const oldCtx = this.getRelationshipContext(config, oldRelationships);
					const allItemsSet = new Set(oldCtx.allPaths);

					for (const addedLink of diff.addedLinks) {
						const newTransitiveItems = await this.computeAllItems([addedLink], diff.propName, filePath);
						for (const item of newTransitiveItems) {
							allItemsSet.add(item);
						}
					}

					computedAllProperties.set(diff.allPropName, [...allItemsSet]);
				}
			}

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
		const removedContext = this.getFileContext(removedLink);
		if (!removedContext.file || !removedContext.frontmatter) {
			return;
		}

		const allPropName = config.getAllProp(this.settings);
		const severedChildren = parsePropertyLinks(removedContext.frontmatter[allPropName]);

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

		const currentContext = this.getFileContext(currentFilePath);
		const affectedNodes: string[] = [currentFilePath];

		if (currentContext.file && currentContext.frontmatter) {
			const allParentPaths = parsePropertyLinks(currentContext.frontmatter[reverseAllPropName]);
			affectedNodes.push(...allParentPaths.map((p) => this.getFileContext(p).pathWithExt));
		}

		// Batch update: remove orphaned children from all affected nodes' all_children
		for (const nodePath of affectedNodes) {
			await this.withFileContext(nodePath, async (node) => {
				await this.app.fileManager.processFrontMatter(node.file!, (fm) => {
					const currentAllChildren = parsePropertyLinks(fm[allPropName]);
					const filteredChildren = currentAllChildren.filter((child) => {
						const childContext = this.getFileContext(child);
						return !orphanedChildren.includes(childContext.pathWithExt);
					});

					if (filteredChildren.length !== currentAllChildren.length) {
						fm[allPropName] = filteredChildren.map((child) => formatWikiLink(this.getFileContext(child).baseName));
					}
				});
			});
		}

		// Batch update: remove all affected nodes from orphaned children's all_parents
		const affectedNodeBaseNames = affectedNodes.map((path) => this.getFileContext(path).baseName);
		for (const orphanedChild of orphanedChildren) {
			await this.withFileContext(orphanedChild, async (child) => {
				await this.app.fileManager.processFrontMatter(child.file!, (fm) => {
					const currentAllParents = parsePropertyLinks(fm[reverseAllPropName]);
					const filteredParents = currentAllParents.filter((parent) => {
						const parentContext = this.getFileContext(parent);
						return !affectedNodeBaseNames.includes(parentContext.baseName);
					});

					if (filteredParents.length !== currentAllParents.length) {
						fm[reverseAllPropName] = filteredParents.map((parent) =>
							formatWikiLink(this.getFileContext(parent).baseName)
						);
					}
				});
			});
		}
	}
}
