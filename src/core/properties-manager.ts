import { type App, TFile } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";
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

		// Parse all relationship links
		const parentPaths = parsePropertyLinks(relationships.parent);
		const childPaths = parsePropertyLinks(relationships.children);
		const relatedPaths = parsePropertyLinks(relationships.related);

		console.log(`  - Parents: ${parentPaths.length}, Children: ${childPaths.length}, Related: ${relatedPaths.length}`);

		// Sync parent relationships (add current file to parent's children)
		for (const parentPath of parentPaths) {
			await this.addToProperty(parentPath, this.settings.childrenProp, currentFilePath);
		}

		// Sync child relationships (add current file to child's parent)
		for (const childPath of childPaths) {
			await this.addToProperty(childPath, this.settings.parentProp, currentFilePath);
		}

		// Sync related relationships (bidirectional)
		for (const relatedPath of relatedPaths) {
			await this.addToProperty(relatedPath, this.settings.relatedProp, currentFilePath);
		}
	}

	private async addToProperty(targetFilePath: string, propertyName: string, fileToAdd: string): Promise<void> {
		// Resolve the target file - add .md extension if not present
		let targetFile = this.app.vault.getAbstractFileByPath(targetFilePath);

		// If not found, try with .md extension
		if (!targetFile && !targetFilePath.endsWith(".md")) {
			targetFile = this.app.vault.getAbstractFileByPath(`${targetFilePath}.md`);
		}

		if (!(targetFile instanceof TFile)) {
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
