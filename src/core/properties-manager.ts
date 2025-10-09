import type { App } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { ensureMarkdownExtension, getFileByPath, removeMarkdownExtension } from "../utils/file-utils";
import { formatWikiLink, parsePropertyLinks } from "../utils/link-parser";
import { addLinkToProperty } from "../utils/property-utils";
import type { FileRelationships, IndexerEvent } from "./indexer";

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

	private async syncRelationships(relationships: FileRelationships): Promise<void> {
		const currentFilePath = relationships.filePath;

		const computedRelationships = new Map<string, string[]>();

		for (const config of RELATIONSHIP_CONFIGS) {
			const paths = relationships[config.type];
			const parsedPaths = parsePropertyLinks(paths);
			const propName = config.getProp(this.settings);
			const allItems = await this.computeAllItems(parsedPaths, propName, currentFilePath);
			computedRelationships.set(config.getAllProp(this.settings), allItems);
		}

		const file = getFileByPath(this.app, currentFilePath);
		if (file) {
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				for (const [allPropName, paths] of computedRelationships) {
					fm[allPropName] = paths.map((path) => formatWikiLink(removeMarkdownExtension(path)));
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

		console.log(`🎯 Computed ${allItems.length} total items for ${propertyName}: [${allItems.join(", ")}]`);
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
