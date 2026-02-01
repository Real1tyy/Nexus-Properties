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

	private async applyFrontmatter(targetFrontmatter: Frontmatter): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		if (!(file instanceof TFile)) {
			throw new Error(`File not found: ${this.filePath}`);
		}

		// Determine which properties to remove (present in source but not in target)
		const sourceFrontmatter =
			targetFrontmatter === this.updatedFrontmatter ? this.originalFrontmatter : this.updatedFrontmatter;

		const keysToRemove = Object.keys(sourceFrontmatter).filter((key) => !(key in targetFrontmatter));

		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			// Only remove properties that were explicitly removed
			for (const key of keysToRemove) {
				delete fm[key];
			}

			// Update/add properties from target frontmatter
			for (const [key, value] of Object.entries(targetFrontmatter)) {
				fm[key] = value;
			}
		});
	}
}
