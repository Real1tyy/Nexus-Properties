import { Notice, Plugin } from "obsidian";
import { NexusPropertiesSettingsTab } from "./components";
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

		this.addSettingTab(new NexusPropertiesSettingsTab(this.app, this));

		// Initialize indexer
		this.indexer = new Indexer(this.app, this.settingsStore.settings$);

		// Subscribe to indexer events
		this.indexer.events$.subscribe((_event) => {
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
