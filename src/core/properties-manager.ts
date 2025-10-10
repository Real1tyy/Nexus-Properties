import type { App } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { ensureMarkdownExtension, getFileByPath, removeMarkdownExtension } from "../utils/file-utils";
import { formatWikiLink, parsePropertyLinks } from "../utils/link-parser";
import { normalizeProperty } from "../utils/property-normalizer";
import { addLinkToProperty } from "../utils/property-utils";
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

		const file = getFileByPath(this.app, currentFilePath);
		if (file) {
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				for (const [allPropName, paths] of computedRelationships) {
					fm[allPropName] = paths.map((path) => formatWikiLink(removeMarkdownExtension(path)));
				}

				for (const propName of propsToDelete) {
					delete fm[propName];
				}
			});
		}

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
				const fullPath = ensureMarkdownExtension(itemPath);

				if (visited.has(fullPath)) {
					continue;
				}

				visited.add(fullPath);
				allItems.push(fullPath);

				const itemFile = getFileByPath(this.app, fullPath);
				if (!itemFile) {
					console.warn(`PropertiesManager: File not found: ${fullPath}`);
					continue;
				}

				const itemFrontmatter = this.app.metadataCache.getFileCache(itemFile)?.frontmatter;

				if (itemFrontmatter?.[propertyName]) {
					const propertyValue = itemFrontmatter[propertyName];
					const nestedItems = normalizeProperty(propertyValue, propertyName);

					await collectItems(nestedItems);
				}
			}
		};
		await collectItems(items);
		return allItems;
	}

	private async addToProperty(targetFilePath: string, propertyName: string, fileToAdd: string): Promise<void> {
		const targetPathWithExt = ensureMarkdownExtension(targetFilePath);
		const fileToAddWithExt = ensureMarkdownExtension(fileToAdd);

		const targetFile = getFileByPath(this.app, targetPathWithExt);

		if (!targetFile) {
			console.warn(`PropertiesManager: Target file not found: ${targetPathWithExt}`);
			return;
		}

		const linkPath = removeMarkdownExtension(fileToAddWithExt);

		await this.app.fileManager.processFrontMatter(targetFile, (fm) => {
			const currentValue = fm[propertyName];
			fm[propertyName] = addLinkToProperty(currentValue, linkPath);
		});
	}

	private async handleFileDeletion(deletedFilePath: string, oldRelationships: FileRelationships): Promise<void> {
		console.log(`🗑️ Handling deletion: ${deletedFilePath}`);

		const deletedFileBaseName = removeMarkdownExtension(deletedFilePath);

		for (const config of RELATIONSHIP_CONFIGS) {
			const reversePropName = config.getReverseProp(this.settings);
			const reverseAllPropName = config.getReverseAllProp(this.settings);

			const directPaths = parsePropertyLinks(oldRelationships[config.type]);
			const allPaths = parsePropertyLinks(oldRelationships[config.allKey]);

			for (const referencedFilePath of directPaths) {
				await this.removeFromProperty(referencedFilePath, reversePropName, deletedFileBaseName);
			}

			for (const referencedFilePath of allPaths) {
				await this.removeFromProperty(referencedFilePath, reverseAllPropName, deletedFileBaseName);
			}
		}

		console.log(`✅ Deletion handled: ${deletedFilePath}`);
	}

	private async handleFileModification(
		filePath: string,
		oldRelationships: FileRelationships,
		newRelationships: FileRelationships
	): Promise<void> {
		console.log(`📝 Handling modification: ${filePath}`);

		const currentFileBaseName = removeMarkdownExtension(filePath);

		// For each relationship type, detect changes and update reverse properties
		for (const config of RELATIONSHIP_CONFIGS) {
			const reversePropName = config.getReverseProp(this.settings);

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
				await this.addToProperty(addedLink, reversePropName, currentFileBaseName);
			}

			// Remove reverse property for removed links
			for (const removedLink of removedLinks) {
				console.log(`  ➖ Removing ${reversePropName} from ${removedLink}`);
				await this.removeFromProperty(removedLink, reversePropName, currentFileBaseName);
			}
		}

		console.log(`✅ Modification handled: ${filePath}`);
	}

	private async removeFromProperty(targetFilePath: string, propertyName: string, fileToRemove: string): Promise<void> {
		const targetPathWithExt = ensureMarkdownExtension(targetFilePath);
		const targetFile = getFileByPath(this.app, targetPathWithExt);

		if (!targetFile) {
			console.warn(`PropertiesManager: Target file not found: ${targetPathWithExt}`);
			return;
		}

		const fileToRemoveBaseName = removeMarkdownExtension(fileToRemove);

		await this.app.fileManager.processFrontMatter(targetFile, (fm) => {
			const currentValue = fm[propertyName];

			if (!currentValue) {
				return;
			}

			const links = parsePropertyLinks(currentValue);
			const filteredLinks = links.filter((link) => {
				const linkBaseName = removeMarkdownExtension(link);
				return linkBaseName !== fileToRemoveBaseName;
			});

			fm[propertyName] = filteredLinks.map((link) => formatWikiLink(removeMarkdownExtension(link)));
		});
	}
}
