import { Plugin } from "obsidian";
import { NexusPropertiesSettingsTab } from "./components";
import { Indexer } from "./core/indexer";
import { PropertiesManager } from "./core/properties-manager";
import { SettingsStore } from "./core/settings-store";

export default class NexusPropertiesPlugin extends Plugin {
	settingsStore!: SettingsStore;
	indexer!: Indexer;
	propertiesManager!: PropertiesManager;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.addSettingTab(new NexusPropertiesSettingsTab(this.app, this));

		this.initializePlugin();
	}

	private async initializePlugin() {
		// Wait for Obsidian's workspace layout to be ready
		await new Promise<void>((resolve) => this.app.workspace.onLayoutReady(resolve));

		// Wait for metadata cache to be fully initialized
		// @ts-expect-error - initialized property exists at runtime but not in type definitions
		if (!this.app.metadataCache.initialized) {
			await new Promise<void>((resolve) => {
				// @ts-expect-error - initialized event exists at runtime but not in type definitions
				this.app.metadataCache.once("initialized", resolve);
			});
		}

		this.indexer = new Indexer(this.app, this.settingsStore.settings$);

		this.propertiesManager = new PropertiesManager(this.app, this.settingsStore.settings$.value);
		this.propertiesManager.start(this.indexer.events$);

		await this.indexer.start();
	}

	async onunload() {
		this.propertiesManager?.stop();
		this.indexer?.stop();
	}

	async triggerFullRescan(): Promise<void> {
		if (!this.propertiesManager || !this.indexer) {
			console.error("❌ Cannot trigger rescan: Plugin not fully initialized");
			return;
		}

		await this.propertiesManager.rescanAndAssignPropertiesForAllFiles(this.indexer);
	}
}
