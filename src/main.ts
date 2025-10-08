import { Notice, Plugin } from "obsidian";
import { Indexer } from "./core/indexer";
import { SettingsStore } from "./core/settings-store";

export default class NexusPropertiesPlugin extends Plugin {
	settingsStore!: SettingsStore;
	indexer!: Indexer;

	async onload() {
		console.log("Loading Nexus Properties plugin");

		// Initialize settings
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		// Initialize indexer
		this.indexer = new Indexer(this.app, this.settingsStore.settings$);

		// Subscribe to indexer events
		this.indexer.events$.subscribe((event) => {
			console.log("[Nexus Properties] Indexer event:", event);
			// Property sync logic will be implemented here
		});

		// Start indexing
		await this.indexer.start();

		new Notice("Nexus Properties: Plugin loaded");
	}

	async onunload() {
		console.log("Unloading Nexus Properties plugin");

		// Stop indexer
		this.indexer?.stop();
	}
}
