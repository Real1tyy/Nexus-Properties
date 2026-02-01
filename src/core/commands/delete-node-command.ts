import { addLinkToProperty, removeMarkdownExtension, withFileContext } from "@real1ty-obsidian-plugins";
import { type App, TFile } from "obsidian";
import type { NexusPropertiesSettings } from "../../types/settings";
import { captureInverseRelationships, type InverseRelationship } from "../../utils/relationship-context";
import type { Command } from "./command";

/**
 * Command to delete a node.
 * Trashes the file and captures relationships for undo restoration.
 * The PropertiesManager handles removing references on execute.
 * On undo, this command restores the file AND the bidirectional relationships.
 */
export class DeleteNodeCommand implements Command {
	private originalContent: string | null = null;
	private capturedRelationships: InverseRelationship[] = [];

	constructor(
		private app: App,
		private filePath: string,
		private settings: NexusPropertiesSettings
	) {}

	async execute(): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		if (!(file instanceof TFile)) {
			throw new Error(`File not found: ${this.filePath}`);
		}

		this.originalContent = await this.app.vault.read(file);

		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter || {};
		this.capturedRelationships = captureInverseRelationships(this.app, this.filePath, frontmatter, this.settings);

		await this.app.vault.trash(file, true);
	}

	async undo(): Promise<void> {
		if (this.originalContent === null) {
			throw new Error("No original content stored for undo");
		}

		const existingFile = this.app.vault.getAbstractFileByPath(this.filePath);
		if (existingFile) {
			throw new Error(`File already exists at: ${this.filePath}`);
		}

		await this.app.vault.create(this.filePath, this.originalContent);
		await this.restoreRelationships();
	}

	getType(): string {
		return "Delete node";
	}

	async canUndo(): Promise<boolean> {
		if (this.originalContent === null) {
			return false;
		}
		const existingFile = this.app.vault.getAbstractFileByPath(this.filePath);
		return existingFile === null;
	}

	private async restoreRelationships(): Promise<void> {
		const linkPath = removeMarkdownExtension(this.filePath);

		for (const rel of this.capturedRelationships) {
			await withFileContext(this.app, rel.targetFilePath, async (target) => {
				if (!target.file) return;
				await this.app.fileManager.processFrontMatter(target.file, (fm) => {
					fm[rel.propertyName] = addLinkToProperty(fm[rel.propertyName], linkPath);
				});
			});
		}
	}
}
