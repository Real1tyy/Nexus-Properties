import type { App, TFile } from "obsidian";
import type { BehaviorSubject } from "rxjs";
import type { NodeCreationType } from "../types/constants";
import type { NexusPropertiesSettings } from "../types/settings";
import { type CommandManager, CreateNodeCommand } from "./commands";

export class NodeCreator {
	private app: App;
	private settingsObservable: BehaviorSubject<NexusPropertiesSettings>;
	private commandManager: CommandManager;

	constructor(app: App, settingsObservable: BehaviorSubject<NexusPropertiesSettings>, commandManager: CommandManager) {
		this.app = app;
		this.settingsObservable = settingsObservable;
		this.commandManager = commandManager;
	}

	async createRelatedNode(sourceFile: TFile, type: NodeCreationType): Promise<TFile | null> {
		const autoName = this.generateAutoNodeName(sourceFile.basename, type);
		return this.createRelatedNodeWithName(sourceFile, type, autoName);
	}

	async createRelatedNodeWithName(sourceFile: TFile, type: NodeCreationType, nodeName: string): Promise<TFile | null> {
		try {
			const settings = this.settingsObservable.value;
			const command = new CreateNodeCommand(this.app, sourceFile.path, type, nodeName, settings);
			await this.commandManager.executeCommand(command);

			const createdPath = command.getCreatedFilePath();
			return createdPath ? (this.app.vault.getAbstractFileByPath(createdPath) as TFile | null) : null;
		} catch (error) {
			console.error(`Error creating ${type} node:`, error);
			return null;
		}
	}

	generateAutoNodeName(sourceBasename: string, type: NodeCreationType): string {
		switch (type) {
			case "parent":
				return ` - ${sourceBasename}`;
			case "child":
				return `${sourceBasename} - `;
			case "related":
				return `${sourceBasename} `;
		}
	}
}
