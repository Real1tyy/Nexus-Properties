import { type App, TFile } from "obsidian";
import type { Frontmatter } from "../../types/settings";
import type { Command } from "./command";

/**
 * Command to edit a node's frontmatter.
 * Captures before and after state for undo/redo.
 */
export class EditNodeCommand implements Command {
	private originalFrontmatter: Frontmatter;
	private updatedFrontmatter: Frontmatter;

	constructor(
		private app: App,
		private filePath: string,
		originalFrontmatter: Frontmatter,
		updatedFrontmatter: Frontmatter
	) {
		this.originalFrontmatter = { ...originalFrontmatter };
		this.updatedFrontmatter = { ...updatedFrontmatter };
	}

	async execute(): Promise<void> {
		await this.applyFrontmatter(this.updatedFrontmatter);
	}

	async undo(): Promise<void> {
		await this.applyFrontmatter(this.originalFrontmatter);
	}

	getType(): string {
		return "Edit node";
	}

	async canUndo(): Promise<boolean> {
		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		return file instanceof TFile;
	}

	private async applyFrontmatter(frontmatter: Frontmatter): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		if (!(file instanceof TFile)) {
			throw new Error(`File not found: ${this.filePath}`);
		}

		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			// Clear existing frontmatter
			for (const key of Object.keys(fm)) {
				delete fm[key];
			}

			// Apply new frontmatter
			for (const [key, value] of Object.entries(frontmatter)) {
				fm[key] = value;
			}
		});
	}
}
