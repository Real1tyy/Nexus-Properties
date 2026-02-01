import { hasLinkInProperty, removeMarkdownExtension } from "@real1ty-obsidian-plugins";
import { type App, Menu, Notice, TFile } from "obsidian";
import { type CommandManager, RemoveRelationshipCommand } from "../../core/commands";
import type { SettingsStore } from "../../core/settings-store";

export class EdgeContextMenu {
	private app: App;
	private settingsStore: SettingsStore;
	private commandManager: CommandManager;
	private onEdgeRemoved: (() => void) | null = null;

	constructor(app: App, settingsStore: SettingsStore, commandManager: CommandManager, onEdgeRemoved?: () => void) {
		this.app = app;
		this.settingsStore = settingsStore;
		this.commandManager = commandManager;
		this.onEdgeRemoved = onEdgeRemoved || null;
	}

	show(e: MouseEvent, sourceId: string, targetId: string, isRelatedView: boolean): void {
		const menu = new Menu();

		menu.addItem((item) => {
			item
				.setTitle("Remove")
				.setIcon("trash")
				.onClick(() => {
					this.removeEdge(sourceId, targetId, isRelatedView);
				});
		});

		menu.showAtMouseEvent(e);
	}

	private async removeEdge(sourceId: string, targetId: string, isRelatedView: boolean): Promise<void> {
		try {
			const settings = this.settingsStore.settings$.value;
			const relationshipType = this.determineRelationshipType(sourceId, targetId, isRelatedView);

			const command = new RemoveRelationshipCommand(this.app, sourceId, targetId, relationshipType, settings);
			await this.commandManager.executeCommand(command);

			new Notice("Relationship removed successfully");

			// Wait for indexer to process the change (300ms debounce + buffer)
			setTimeout(() => {
				this.onEdgeRemoved?.();
			}, 400);
		} catch (error) {
			console.error("Failed to remove relationship:", error);
			new Notice("Failed to remove relationship");
		}
	}

	private determineRelationshipType(
		sourceId: string,
		targetId: string,
		isRelatedView: boolean
	): "parent" | "children" | "related" {
		if (isRelatedView) {
			return "related";
		}

		const settings = this.settingsStore.settings$.value;
		const childrenProp = settings.childrenProp;

		const sourceFile = this.app.vault.getAbstractFileByPath(sourceId);
		if (!(sourceFile instanceof TFile)) {
			// Default to parent if we can't determine
			return "parent";
		}

		const targetPath = removeMarkdownExtension(targetId);
		const sourceCache = this.app.metadataCache.getFileCache(sourceFile);
		const sourceFm = sourceCache?.frontmatter || {};

		// If target is in source's children, it's a children relationship (source is parent)
		// Otherwise, it's a parent relationship (source is child)
		return hasLinkInProperty(sourceFm[childrenProp], targetPath) ? "children" : "parent";
	}
}
