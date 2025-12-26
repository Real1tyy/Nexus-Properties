import { type App, Menu, Modal, Notice, Setting, TFile } from "obsidian";
import type { SettingsStore } from "../../core/settings-store";
import type { RelationshipType } from "../../types/constants";
import { NodeEditModal } from "../node-edit-modal";
import { NodePreviewModal } from "../node-preview-modal";

interface NodeContextMenuCallbacks {
	onStartRelationship: (sourceNodePath: string, relationshipType: RelationshipType) => void;
}

export class NodeContextMenu {
	private app: App;
	private settingsStore: SettingsStore;
	private callbacks: NodeContextMenuCallbacks;

	constructor(app: App, settingsStore: SettingsStore, callbacks: NodeContextMenuCallbacks) {
		this.app = app;
		this.settingsStore = settingsStore;
		this.callbacks = callbacks;
	}

	show(e: MouseEvent, filePath: string): void {
		const menu = new Menu();

		menu.addItem((item) => {
			item
				.setTitle("Open")
				.setIcon("file")
				.onClick(() => {
					this.openFile(filePath);
				});
		});

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

		// Add relationship options
		menu.addItem((item) => {
			item
				.setTitle("Add Related")
				.setIcon("link")
				.onClick(() => {
					this.callbacks.onStartRelationship(filePath, "related");
				});
		});

		menu.addItem((item) => {
			item
				.setTitle("Add Parent")
				.setIcon("arrow-up")
				.onClick(() => {
					this.callbacks.onStartRelationship(filePath, "parent");
				});
		});

		menu.addItem((item) => {
			item
				.setTitle("Add Child")
				.setIcon("arrow-down")
				.onClick(() => {
					this.callbacks.onStartRelationship(filePath, "children");
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

	private openFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return;
		}

		this.app.workspace.getLeaf(false).openFile(file);
	}

	private openPreview(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return;
		}

		new NodePreviewModal(this.app, file, this.settingsStore).open();
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

	private async deleteFile(filePath: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return;
		}

		// Confirm deletion
		const confirmed = await this.confirmDialog(`Delete "${file.basename}"?`, "This action cannot be undone.");
		if (!confirmed) return;

		try {
			await this.app.vault.trash(file, true);
			new Notice(`Deleted: ${file.basename}`);
		} catch (error) {
			console.error("Failed to delete file:", error);
			new Notice("Failed to delete file");
		}
	}

	private confirmDialog(title: string, message: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText(title);
			modal.contentEl.createEl("p", { text: message });

			new Setting(modal.contentEl)
				.addButton((btn) =>
					btn.setButtonText("Cancel").onClick(() => {
						modal.close();
						resolve(false);
					})
				)
				.addButton((btn) =>
					btn
						.setButtonText("Delete")
						.setCta()
						.setWarning()
						.onClick(() => {
							modal.close();
							resolve(true);
						})
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
