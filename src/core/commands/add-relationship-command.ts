import {
	addLinkToProperty,
	hasLinkInProperty,
	removeLinkFromProperty,
	removeMarkdownExtension,
} from "@real1ty-obsidian-plugins";
import { type App, TFile } from "obsidian";
import { RELATIONSHIP_CONFIGS, type RelationshipType } from "../../types/constants";
import type { Frontmatter, NexusPropertiesSettings } from "../../types/settings";
import type { Command } from "./command";

/**
 * Command to add a relationship between two nodes.
 * Adds a wiki link to the source file's property.
 * The PropertiesManager handles creating the reverse link.
 */
export class AddRelationshipCommand implements Command {
	private propertyName: string;
	private targetLinkPath: string;

	constructor(
		private app: App,
		private sourceFilePath: string,
		targetFilePath: string,
		private relationshipType: RelationshipType,
		settings: NexusPropertiesSettings
	) {
		const config = RELATIONSHIP_CONFIGS.find((c) => c.type === relationshipType);
		if (!config) {
			throw new Error(`Unknown relationship type: ${relationshipType}`);
		}

		this.propertyName = config.getProp(settings);
		this.targetLinkPath = removeMarkdownExtension(targetFilePath);
	}

	async execute(): Promise<void> {
		const sourceFile = this.app.vault.getAbstractFileByPath(this.sourceFilePath);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${this.sourceFilePath}`);
		}

		await this.app.fileManager.processFrontMatter(sourceFile, (fm: Frontmatter) => {
			fm[this.propertyName] = addLinkToProperty(
				fm[this.propertyName] as string | string[] | undefined,
				this.targetLinkPath
			);
		});
	}

	async undo(): Promise<void> {
		const sourceFile = this.app.vault.getAbstractFileByPath(this.sourceFilePath);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${this.sourceFilePath}`);
		}

		await this.app.fileManager.processFrontMatter(sourceFile, (fm: Frontmatter) => {
			fm[this.propertyName] = removeLinkFromProperty(
				fm[this.propertyName] as string | string[] | undefined,
				this.targetLinkPath
			);
		});
	}

	getType(): string {
		return `Add ${this.relationshipType} relationship`;
	}

	async canUndo(): Promise<boolean> {
		const sourceFile = this.app.vault.getAbstractFileByPath(this.sourceFilePath);
		if (!(sourceFile instanceof TFile)) {
			return false;
		}

		const cache = this.app.metadataCache.getFileCache(sourceFile);
		const fm = cache?.frontmatter || {};
		return hasLinkInProperty(fm[this.propertyName] as string | string[] | undefined, this.targetLinkPath);
	}
}
