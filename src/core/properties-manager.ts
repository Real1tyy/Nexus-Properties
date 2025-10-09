import type { App } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { ensureMarkdownExtension, getFileByPath, removeMarkdownExtension } from "../utils/file-utils";
import { formatWikiLink, parsePropertyLinks } from "../utils/link-parser";
import { addLinkToProperty } from "../utils/property-utils";
import type { FileRelationships, Indexer, IndexerEvent } from "./indexer";

export class PropertiesManager {
	private subscription: Subscription | null = null;

	constructor(
		private app: App,
		private settings: NexusPropertiesSettings
	) {}

	start(events$: Observable<IndexerEvent>): void {
		this.subscription = events$
			.pipe(filter((event) => event.type === "file-changed" && event.relationships !== undefined))
			.subscribe((event) => {
				this.syncRelationships(event.relationships!);
			});
	}

	stop(): void {
		this.subscription?.unsubscribe();
		this.subscription = null;
	}

	async rescanAndAssignPropertiesForAllFiles(indexer: Indexer): Promise<void> {
		console.log("🔄 Starting full vault rescan and property assignment...");

		const startTime = Date.now();
		const allFiles = this.app.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => indexer.shouldIndexFile(file.path));

		console.log(`📁 Found ${relevantFiles.length} files to process (filtered from ${allFiles.length} total files)`);

		const results = await Promise.allSettled(
			relevantFiles.map(async (file) => {
				const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!frontmatter) {
					return;
				}

				const relationships: FileRelationships = {
					filePath: file.path,
					mtime: file.stat.mtime,
					parent: [],
					children: [],
					related: [],
					allParents: [],
					allChildren: [],
					allRelated: [],
					frontmatter,
				};

				// Extract relationships from frontmatter
				for (const config of RELATIONSHIP_CONFIGS) {
					const propName = config.getProp(this.settings);
					const rawValue = frontmatter[propName];

					if (rawValue) {
						const paths = parsePropertyLinks(rawValue);
						relationships[config.type] = paths;
					}
				}

				// Sync relationships for this file
				await this.syncRelationships(relationships);
			})
		);

		const errorCount = results.filter((r) => r.status === "rejected").length;
		const successCount = results.filter((r) => r.status === "fulfilled").length;

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`✅ Rescan complete! Processed ${successCount} files in ${duration}s (${errorCount} errors)`);
	}

	private async syncRelationships(relationships: FileRelationships): Promise<void> {
		const currentFilePath = relationships.filePath;
		const { frontmatter } = relationships;

		const computedRelationships = new Map<string, string[]>();
		const propsToDelete = new Set<string>();

		for (const config of RELATIONSHIP_CONFIGS) {
			const paths = relationships[config.type];
			const parsedPaths = parsePropertyLinks(paths);
			const propName = config.getProp(this.settings);
			const allPropName = config.getAllProp(this.settings);

			const isPropertyDefined = propName in frontmatter;

			if (isPropertyDefined) {
				const allItems = await this.computeAllItems(parsedPaths, propName, currentFilePath);
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
			const paths = relationships[config.type];
			const parsedPaths = parsePropertyLinks(paths);
			const reversePropName = config.getReverseProp(this.settings);

			for (const path of parsedPaths) {
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
					const nestedItems = parsePropertyLinks(propertyValue);

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
}
