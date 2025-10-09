import { type App, TFile } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { RELATIONSHIP_CONFIGS } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { formatWikiLink, parsePropertyLinks } from "../utils/link-parser";
import type { FileRelationships, IndexerEvent } from "./indexer";

export class PropertiesManager {
	private subscription: Subscription | null = null;

	constructor(
		private app: App,
		private settings: NexusPropertiesSettings
	) {}

	start(events$: Observable<IndexerEvent>): void {
		console.log("PropertiesManager: Starting, listening for file change events...");

		this.subscription = events$
			.pipe(filter((event) => event.type === "file-changed" && event.relationships !== undefined))
			.subscribe((event) => {
				if (event.relationships) {
					this.syncRelationships(event.relationships);
				}
			});
	}

	stop(): void {
		this.subscription?.unsubscribe();
		this.subscription = null;
	}

	private async syncRelationships(relationships: FileRelationships): Promise<void> {
		const currentFilePath = relationships.filePath;
		console.log(`PropertiesManager: Syncing relationships for ${currentFilePath}`);

		const computedRelationships = new Map<string, string[]>();

		for (const config of RELATIONSHIP_CONFIGS) {
			const paths = relationships[config.type];
			const parsedPaths = parsePropertyLinks(paths);
			const propName = config.getProp(this.settings);

			console.log(`  - ${config.type}: ${parsedPaths.length} items`);

			const allItems = await this.computeAllItems(parsedPaths, propName, currentFilePath);
			computedRelationships.set(config.getAllProp(this.settings), allItems);
		}

		const file = this.getFileByPath(currentFilePath);
		if (file) {
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				for (const [allPropName, paths] of computedRelationships) {
					fm[allPropName] = paths.map((path) => formatWikiLink(path.endsWith(".md") ? path.slice(0, -3) : path));
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
		const normalizedSourcePath = this.normalizePath(sourceFilePath);
		const visited = new Set<string>([normalizedSourcePath]);
		const allItems: string[] = [];

		const collectItems = async (itemsToProcess: string[]) => {
			for (const itemPath of itemsToProcess) {
				const actualPath = this.normalizePath(itemPath);

				if (visited.has(actualPath)) {
					continue;
				}

				visited.add(actualPath);
				allItems.push(actualPath);

				const itemFile = this.getFileByPath(actualPath);
				if (!itemFile) {
					console.warn(`PropertiesManager: File not found: ${actualPath}`);
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

	private normalizePath(path: string): string {
		if (path.endsWith(".md")) {
			return path.slice(0, -3);
		}
		return path;
	}

	private getFileByPath(filePath: string): TFile | null {
		// Try exact path first
		let file = this.app.vault.getAbstractFileByPath(filePath);

		// Try with .md extension
		if (!file && !filePath.endsWith(".md")) {
			file = this.app.vault.getAbstractFileByPath(`${filePath}.md`);
		}

		return file instanceof TFile ? file : null;
	}

	private async addToProperty(targetFilePath: string, propertyName: string, fileToAdd: string): Promise<void> {
		const targetFile = this.getFileByPath(targetFilePath);

		if (!targetFile) {
			console.warn(`PropertiesManager: Target file not found: ${targetFilePath}`);
			return;
		}

		console.log(`  → Adding ${fileToAdd} to ${propertyName} of ${targetFilePath}`);

		// Remove .md extension from fileToAdd for the link
		const linkPath = fileToAdd.endsWith(".md") ? fileToAdd.slice(0, -3) : fileToAdd;

		// Use Obsidian's processFrontMatter API to update the property
		await this.app.fileManager.processFrontMatter(targetFile, (fm) => {
			const currentValue = fm[propertyName];
			const linkToAdd = formatWikiLink(linkPath);

			// Handle undefined/null - initialize as array with single link
			if (!currentValue) {
				console.log(`    ✓ Property ${propertyName} is empty, initializing with [${linkPath}]`);
				fm[propertyName] = [linkToAdd];
				return;
			}

			// Handle string value - convert to array if link doesn't exist
			if (typeof currentValue === "string") {
				const existingPath = parsePropertyLinks(currentValue)[0];
				if (existingPath !== linkPath) {
					console.log(`    ✓ Converting ${propertyName} to array and adding ${linkPath}`);
					fm[propertyName] = [currentValue, linkToAdd];
				} else {
					console.log(`    ⊘ Link ${linkPath} already exists in ${propertyName} (string)`);
				}
				return;
			}

			// Handle array value - add if not already present
			if (Array.isArray(currentValue)) {
				const existingPaths = parsePropertyLinks(currentValue);
				if (!existingPaths.includes(linkPath)) {
					console.log(`    ✓ Adding ${linkPath} to ${propertyName} array`);
					fm[propertyName] = [...currentValue, linkToAdd];
				} else {
					console.log(`    ⊘ Link ${linkPath} already exists in ${propertyName} (array)`);
				}
				return;
			}

			// Unexpected type - replace with new array
			console.warn(
				`PropertiesManager: Unexpected property type for ${propertyName} in ${targetFilePath}:`,
				typeof currentValue
			);
			fm[propertyName] = [linkToAdd];
		});
	}
}
