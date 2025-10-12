import { Plugin } from "obsidian";
import { NexusPropertiesSettingsTab } from "./components";
import { RelationshipGraphView, VIEW_TYPE_RELATIONSHIP_GRAPH } from "./components/relationship-graph-view";
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

		this.addCommand({
			id: "toggle-relationship-graph",
			name: "Show Relationship Graph",
			callback: () => {
				this.toggleRelationshipGraphView();
			},
		});

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

		this.registerView(VIEW_TYPE_RELATIONSHIP_GRAPH, (leaf) => new RelationshipGraphView(leaf, this.indexer, this));
	}

	async onunload() {
		this.propertiesManager?.stop();
		this.indexer?.stop();
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_RELATIONSHIP_GRAPH);
	}

	async triggerFullRescan(): Promise<void> {
		if (!this.propertiesManager || !this.indexer) {
			console.error("❌ Cannot trigger rescan: Plugin not fully initialized");
			return;
		}

		await this.propertiesManager.rescanAndAssignPropertiesForAllFiles(this.indexer);
	}

	private async toggleRelationshipGraphView(): Promise<void> {
		const { workspace } = this.app;

		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_RELATIONSHIP_GRAPH);

		if (existingLeaves.length > 0) {
			// View exists, reveal/focus it
			const firstLeaf = existingLeaves[0];
			workspace.revealLeaf(firstLeaf);
		} else {
			// View doesn't exist, create it in the left sidebar
			const leaf = workspace.getLeftLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_RELATIONSHIP_GRAPH, active: true });
				workspace.revealLeaf(leaf);
			}
		}
	}
}
