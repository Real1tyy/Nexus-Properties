import { type App, Notice } from "obsidian";
import { AddRelationshipCommand, type CommandManager } from "../core/commands";
import type { SettingsStore } from "../core/settings-store";
import type { RelationshipType } from "../types/constants";

/**
 * Handles adding relationships between nodes using a template method pattern.
 * Manages the state of relationship creation and updates frontmatter properties.
 */
export class RelationshipAdder {
	private sourceNodePath: string | null = null;
	private relationshipType: RelationshipType | null = null;
	private isActive = false;

	constructor(
		private app: App,
		private settingsStore: SettingsStore,
		private commandManager: CommandManager,
		private onRelationshipAdded?: () => void
	) {}

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
			const settings = this.settingsStore.settings$.value;
			const command = new AddRelationshipCommand(
				this.app,
				this.sourceNodePath,
				targetNodePath,
				this.relationshipType,
				settings
			);
			await this.commandManager.executeCommand(command);
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

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}
