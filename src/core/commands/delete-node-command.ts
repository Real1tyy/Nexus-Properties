import { type App, TFile } from "obsidian";
import type { Command } from "./command";

/**
 * Command to delete a node.
 * Trashes the file and the PropertiesManager handles removing references.
 */
export class DeleteNodeCommand implements Command {
	private originalContent: string | null = null;

	constructor(
		private app: App,
		private filePath: string
	) {}

	async execute(): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		if (!(file instanceof TFile)) {
			throw new Error(`File not found: ${this.filePath}`);
		}

		this.originalContent = await this.app.vault.read(file);
		await this.app.vault.trash(file, true);
	}

	async undo(): Promise<void> {
		if (this.originalContent === null) {
			throw new Error("No original content stored for undo");
		}

		// Check if file already exists (shouldn't happen, but be safe)
		const existingFile = this.app.vault.getAbstractFileByPath(this.filePath);
		if (existingFile) {
			throw new Error(`File already exists at: ${this.filePath}`);
		}

		await this.app.vault.create(this.filePath, this.originalContent);
	}

	getType(): string {
		return "Delete node";
	}

	async canUndo(): Promise<boolean> {
		// Can undo if we have original content and the file doesn't exist
		if (this.originalContent === null) {
			return false;
		}

		const existingFile = this.app.vault.getAbstractFileByPath(this.filePath);
		return existingFile === null;
	}
}
