import { Notice, Plugin, TFile } from "obsidian";
import { NexusPropertiesSettingsTab } from "./components";
import { RelationshipGraphView, VIEW_TYPE_RELATIONSHIP_GRAPH } from "./components/relationship-graph-view";
import { Indexer } from "./core/indexer";
import { NodeCreator } from "./core/node-creator";
import { PropertiesManager } from "./core/properties-manager";
import { SettingsStore } from "./core/settings-store";

export default class NexusPropertiesPlugin extends Plugin {
	settingsStore!: SettingsStore;
	indexer!: Indexer;
	propertiesManager!: PropertiesManager;
	nodeCreator!: NodeCreator;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.addSettingTab(new NexusPropertiesSettingsTab(this.app, this));

		this.addCommand({
			id: "toggle-relationship-graph",
			name: "Show Relationship Graph",
			callback: () => this.toggleRelationshipGraphView(),
		});

		this.addCommand({
			id: "enlarge-relationship-graph",
			name: "Enlarge Graph",
			callback: () => this.executeGraphViewMethod("toggleEnlargement"),
		});

		this.addCommand({
			id: "toggle-graph-search",
			name: "Toggle Graph Search",
			callback: () => this.executeGraphViewMethod("toggleSearch"),
		});

		this.addCommand({
			id: "toggle-graph-filter",
			name: "Toggle Graph Filter (Expression Input)",
			callback: () => this.executeGraphViewMethod("toggleFilter"),
		});

		this.addCommand({
			id: "toggle-graph-filter-preset",
			name: "Toggle Graph Filter (Preset Selector)",
			callback: () => this.executeGraphViewMethod("toggleFilterPreset"),
		});

		this.addCommand({
			id: "hide-focus-node-content",
			name: "Toggle Focus Content (Zoom Preview)",
			callback: () =>
				this.executeGraphViewMethod("toggleHideContent", "Open the Relationship Graph to toggle content visibility"),
		});

		this.addCommand({
			id: "hide-focus-node-frontmatter",
			name: "Toggle Focus Frontmatter (Zoom Preview)",
			callback: () =>
				this.executeGraphViewMethod(
					"toggleHideFrontmatter",
					"Open the Relationship Graph to toggle frontmatter visibility"
				),
		});

		this.addCommand({
			id: "create-parent-node",
			name: "Create Parent Node",
			checkCallback: (checking: boolean) => this.handleNodeCreationCommand(checking, "parent"),
		});

		this.addCommand({
			id: "create-child-node",
			name: "Create Child Node",
			checkCallback: (checking: boolean) => this.handleNodeCreationCommand(checking, "child"),
		});

		this.addCommand({
			id: "create-related-node",
			name: "Create Related Node",
			checkCallback: (checking: boolean) => this.handleNodeCreationCommand(checking, "related"),
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

		this.nodeCreator = new NodeCreator(this.app, this.settingsStore.settings$);

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

	private executeGraphViewMethod(methodName: string, noticeMessage?: string): void {
		const { workspace } = this.app;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_RELATIONSHIP_GRAPH);

		if (existingLeaves.length > 0) {
			const graphView = existingLeaves[0].view;
			if (graphView instanceof RelationshipGraphView) {
				const method = graphView[methodName as keyof RelationshipGraphView];
				if (typeof method === "function") {
					(method as () => void).call(graphView);
				}
				return;
			}
		}

		if (noticeMessage) {
			new Notice(noticeMessage);
		}
	}

	private handleNodeCreationCommand(checking: boolean, type: "parent" | "child" | "related"): boolean {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || !(activeFile instanceof TFile)) {
			return false;
		}

		if (!this.indexer?.shouldIndexFile(activeFile.path)) {
			return false;
		}

		if (checking) {
			return true;
		}

		this.createNodeAndOpen(activeFile, type);
		return true;
	}

	private async createNodeAndOpen(sourceFile: TFile, type: "parent" | "child" | "related"): Promise<void> {
		const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

		try {
			const newFile = await this.nodeCreator.createRelatedNode(sourceFile, type);

			if (newFile) {
				const leaf = this.app.workspace.getLeaf("tab");
				await leaf.openFile(newFile);
				new Notice(`✅ Created ${typeLabel} node: ${newFile.basename}`);
			} else {
				new Notice(`❌ Failed to create ${typeLabel} node`);
			}
		} catch (error) {
			console.error(`Error creating ${typeLabel} node:`, error);
			new Notice(`❌ Error creating ${typeLabel} node: ${error}`);
		}
	}
}
