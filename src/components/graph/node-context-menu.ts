import { extractUserFrontmatter } from "@real1ty-obsidian-plugins";
import { type App, Menu, Notice, TFile } from "obsidian";
import { type CommandManager, DeleteNodeCommand, EditNodeCommand } from "../../core/commands";
import type { SettingsStore } from "../../core/settings-store";
import type { RelationshipType } from "../../types/constants";
import type { Frontmatter } from "../../types/settings";
import { NodeEditModal } from "../node-edit-modal";
import { NodePreviewModal } from "../node-preview-modal";

interface NodeContextMenuCallbacks {
	onStartRelationship: (sourceNodePath: string, relationshipType: RelationshipType) => void;
	onRenderAsRoot: (nodeId: string) => void;
	onNodeDeleted: () => void;
}

export class NodeContextMenu {
	private app: App;
	private settingsStore: SettingsStore;
	private commandManager: CommandManager;
	private callbacks: NodeContextMenuCallbacks;

	constructor(
		app: App,
		settingsStore: SettingsStore,
		commandManager: CommandManager,
		callbacks: NodeContextMenuCallbacks
	) {
		this.app = app;
		this.settingsStore = settingsStore;
		this.commandManager = commandManager;
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
				.setTitle("Render as Root")
				.setIcon("git-branch")
				.onClick(() => {
					this.callbacks.onRenderAsRoot(filePath);
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

		// Capture original frontmatter before opening the modal
		const cache = this.app.metadataCache.getFileCache(file);
		const originalFrontmatter = extractUserFrontmatter(cache);

		new NodeEditModal(this.app, file, async (updatedFrontmatter) => {
			await this.updateFileFrontmatter(file, originalFrontmatter, updatedFrontmatter);
		}).open();
	}

	private async deleteFile(filePath: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`File not found: ${filePath}`);
			return;
		}

		try {
			const command = new DeleteNodeCommand(this.app, filePath, this.settingsStore.currentSettings);
			await this.commandManager.executeCommand(command);
			new Notice(`Deleted: ${file.basename}`);
			this.callbacks.onNodeDeleted();
		} catch (error) {
			console.error("Failed to delete file:", error);
			new Notice("Failed to delete file");
		}
	}

	private async updateFileFrontmatter(
		file: TFile,
		originalFrontmatter: Frontmatter,
		updatedFrontmatter: Frontmatter
	): Promise<void> {
		try {
			const command = new EditNodeCommand(this.app, file.path, originalFrontmatter, updatedFrontmatter);
			await this.commandManager.executeCommand(command);
			new Notice("Frontmatter updated successfully");
		} catch (error) {
			console.error("Failed to update frontmatter:", error);
			new Notice("Failed to update frontmatter");
		}
	}
}
