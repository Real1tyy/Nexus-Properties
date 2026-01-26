import { addLinkToProperty, removeMarkdownExtension } from "@real1ty-obsidian-plugins";
import { type App, Notice, TFile } from "obsidian";
import type { SettingsStore } from "../core/settings-store";
import { RELATIONSHIP_CONFIGS, type RelationshipType } from "../types/constants";

/**
 * Handles adding relationships between nodes using a template method pattern.
 * Manages the state of relationship creation and updates frontmatter properties.
 */
export class RelationshipAdder {
	private app: App;
	private settingsStore: SettingsStore;
	private sourceNodePath: string | null = null;
	private relationshipType: RelationshipType | null = null;
	private isActive = false;
	private onRelationshipAdded: (() => void) | null = null;

	constructor(app: App, settingsStore: SettingsStore, onRelationshipAdded?: () => void) {
		this.app = app;
		this.settingsStore = settingsStore;
		this.onRelationshipAdded = onRelationshipAdded || null;
	}

	startSelection(sourceNodePath: string, relationshipType: RelationshipType): void {
		this.sourceNodePath = sourceNodePath;
		this.relationshipType = relationshipType;
		this.isActive = true;
		new Notice(`Click on a node to add as ${relationshipType}`);
	}

	async completeSelection(targetNodePath: string): Promise<void> {
		if (!this.isActive || !this.sourceNodePath || !this.relationshipType) {
			return;
		}

		// Prevent self-relationships
		if (this.sourceNodePath === targetNodePath) {
			new Notice("Cannot create relationship with the same node");
			this.cancel();
			return;
		}

		try {
			await this.addRelationship(this.sourceNodePath, targetNodePath, this.relationshipType);
			new Notice(`${this.capitalize(this.relationshipType)} relationship added successfully`);

			// Wait for indexer to process the change (300ms debounce + buffer)
			setTimeout(() => {
				this.onRelationshipAdded?.();
			}, 400);
		} catch (error) {
			console.error("Failed to add relationship:", error);
			new Notice("Failed to add relationship");
		} finally {
			this.cancel();
		}
	}

	cancel(): void {
		this.sourceNodePath = null;
		this.relationshipType = null;
		this.isActive = false;
	}

	isSelectionActive(): boolean {
		return this.isActive;
	}

	getSourceNodePath(): string | null {
		return this.sourceNodePath;
	}

	private async addRelationship(
		sourceNodePath: string,
		targetNodePath: string,
		relationshipType: RelationshipType
	): Promise<void> {
		const settings = this.settingsStore.settings$.value;
		const config = RELATIONSHIP_CONFIGS.find((c) => c.type === relationshipType);
		if (!config) {
			throw new Error(`Unknown relationship type: ${relationshipType}`);
		}

		const propertyName = config.getProp(settings);
		const sourceFile = this.app.vault.getAbstractFileByPath(sourceNodePath);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${sourceNodePath}`);
		}

		const targetPath = removeMarkdownExtension(targetNodePath);

		await this.app.fileManager.processFrontMatter(sourceFile, (fm) => {
			fm[propertyName] = addLinkToProperty(fm[propertyName], targetPath);
		});
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}
