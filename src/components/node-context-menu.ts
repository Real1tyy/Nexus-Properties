import { type App, Menu, Modal, Notice, TFile } from "obsidian";
import { NodeEditModal } from "./node-edit-modal";
import { NodePreviewModal } from "./node-preview-modal";

export class NodeContextMenu {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	show(e: MouseEvent, filePath: string): void {
		const menu = new Menu();

		menu.addItem((item) => {
			item
				.setTitle("Preview")
				.setIcon("eye")
				.onClick(() => {
					this.openPreview(filePath);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle("Edit")
				.setIcon("edit")
				.onClick(() => {
					this.openEdit(filePath);
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item
				.setTitle("Open file")
				.setIcon("file-text")
				.onClick(() => {
					this.openFile(filePath);
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item
				.setTitle("Delete")
				.setIcon("trash")
				.onClick(() => {
					this.deleteFile(filePath);
				});
		});

		menu.showAtMouseEvent(e);
	}

	private openPreview(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return;
		}

		new NodePreviewModal(this.app, file).open();
	}

	private openEdit(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return;
		}

		new NodeEditModal(this.app, file, async (updatedFrontmatter) => {
			await this.updateFileFrontmatter(file, updatedFrontmatter);
		}).open();
	}

	private openFile(filePath: string): void {
		this.app.workspace.openLinkText(filePath, "", false);
	}

	private async deleteFile(filePath: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return;
		}

		// Confirm deletion
		const confirmed = await this.confirmDeletion(file.basename);
		if (!confirmed) return;

		try {
			await this.app.vault.trash(file, true);
			new Notice(`Deleted: ${file.basename}`);
		} catch (error) {
			console.error("Failed to delete file:", error);
			new Notice("Failed to delete file");
		}
	}

	private confirmDeletion(fileName: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new ConfirmationModal(
				this.app,
				`Delete "${fileName}"?`,
				"This action cannot be undone.",
				(confirmed) => {
					resolve(confirmed);
				}
			);
			modal.open();
		});
	}

	private async updateFileFrontmatter(file: TFile, updatedFrontmatter: Record<string, unknown>): Promise<void> {
		try {
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				// Clear existing frontmatter
				for (const key of Object.keys(fm)) {
					delete fm[key];
				}

				// Apply updated frontmatter
				for (const [key, value] of Object.entries(updatedFrontmatter)) {
					fm[key] = value;
				}
			});

			new Notice("Frontmatter updated successfully");
		} catch (error) {
			console.error("Failed to update frontmatter:", error);
			new Notice("Failed to update frontmatter");
		}
	}
}

class ConfirmationModal extends Modal {
	private title: string;
	private message: string;
	private onConfirm: (confirmed: boolean) => void;

	constructor(app: App, title: string, message: string, onConfirm: (confirmed: boolean) => void) {
		super(app);
		this.title = title;
		this.message = message;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: this.title });
		contentEl.createEl("p", { text: this.message });

		const buttonContainer = contentEl.createDiv("modal-button-container");

		const confirmButton = buttonContainer.createEl("button", {
			text: "Delete",
			cls: "mod-warning",
		});
		confirmButton.addEventListener("click", () => {
			this.onConfirm(true);
			this.close();
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		cancelButton.addEventListener("click", () => {
			this.onConfirm(false);
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
