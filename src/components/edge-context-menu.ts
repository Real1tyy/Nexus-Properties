import { type App, Menu, Notice, TFile } from "obsidian";
import type { SettingsStore } from "../core/settings-store";
import { removeMarkdownExtension } from "../utils/file";
import { hasLinkInProperty, removeLinkFromProperty } from "../utils/property-utils";

export class EdgeContextMenu {
	private app: App;
	private settingsStore: SettingsStore;

	constructor(app: App, settingsStore: SettingsStore) {
		this.app = app;
		this.settingsStore = settingsStore;
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
			if (isRelatedView) {
				await this.removeRelatedConnection(sourceId, targetId);
			} else {
				await this.removeHierarchicalConnection(sourceId, targetId);
			}

			new Notice("Relationship removed successfully");
		} catch (error) {
			console.error("Failed to remove relationship:", error);
			new Notice("Failed to remove relationship");
		}
	}

	private async removeRelatedConnection(sourceId: string, targetId: string): Promise<void> {
		const settings = this.settingsStore.settings$.value;
		const relatedProp = settings.relatedProp;

		const sourceFile = this.app.vault.getAbstractFileByPath(sourceId);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${sourceId}`);
		}

		const targetPath = removeMarkdownExtension(targetId);

		await this.app.fileManager.processFrontMatter(sourceFile, (fm) => {
			const updatedRelated = removeLinkFromProperty(fm[relatedProp], targetPath);
			fm[relatedProp] = updatedRelated;
		});
	}

	private async removeHierarchicalConnection(sourceId: string, targetId: string): Promise<void> {
		const settings = this.settingsStore.settings$.value;
		const parentProp = settings.parentProp;
		const childrenProp = settings.childrenProp;

		const sourceFile = this.app.vault.getAbstractFileByPath(sourceId);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${sourceId}`);
		}

		const targetPath = removeMarkdownExtension(targetId);

		// Determine relationship direction by checking if target is in source's children
		const sourceCache = this.app.metadataCache.getFileCache(sourceFile);
		const sourceFm = sourceCache?.frontmatter || {};
		const isParentChildRelationship = hasLinkInProperty(sourceFm[childrenProp], targetPath);

		await this.app.fileManager.processFrontMatter(sourceFile, (fm) => {
			const propertyToUpdate = isParentChildRelationship ? childrenProp : parentProp;
			const updatedProperty = removeLinkFromProperty(fm[propertyToUpdate], targetPath);
			fm[propertyToUpdate] = updatedProperty;
		});
	}
}
