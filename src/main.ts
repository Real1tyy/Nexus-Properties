import { activateView, buildUtmUrl, type LeafPlacement, SettingsStore } from "@real1ty-obsidian-plugins";
import { showWhatsNewReactModal, type WhatsNewModalConfig } from "@real1ty-obsidian-plugins-react";
import { Notice, Plugin, TFile } from "obsidian";

import CHANGELOG_CONTENT from "../../docs-site/docs/changelog.md";
import { NexusPropertiesSettingsTab, NodeCreationModal, TitlePropertySetupModal } from "./components";
import { NexusViewSwitcher, VIEW_TYPE_NEXUS_SWITCHER } from "./components/views/nexus-view-switcher";
import { CommandManager } from "./core/commands";
import { Indexer } from "./core/indexer";
import { NodeCreator } from "./core/node-creator";
import { PropertiesManager } from "./core/properties-manager";
import type { NexusPropertiesSettingsStore } from "./types/settings";
import { NexusPropertiesSettingsSchema } from "./types/settings";

export default class NexusPropertiesPlugin extends Plugin {
	settingsStore!: NexusPropertiesSettingsStore;
	indexer!: Indexer;
	propertiesManager!: PropertiesManager;
	nodeCreator!: NodeCreator;
	commandManager!: CommandManager;

	override async onload() {
		this.settingsStore = new SettingsStore(this, NexusPropertiesSettingsSchema);
		await this.settingsStore.loadSettings();

		this.commandManager = new CommandManager({ showNotices: true });

		this.addSettingTab(new NexusPropertiesSettingsTab(this.app, this));

		this.addCommand({
			id: "toggle-relationship-graph",
			name: "Show Relationship Graph",
			callback: () => this.toggleRelationshipGraphView(),
		});

		this.addCommand({
			id: "toggle-view-mode",
			name: "Toggle View Mode (Graph/Bases/MOC)",
			callback: () => this.toggleViewMode(),
		});

		this.addCommand({
			id: "enlarge-relationship-graph",
			name: "Enlarge Graph",
			callback: () => this.toggleEnlargement(),
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
			id: "center-on-source",
			name: "Center on Source Node",
			callback: () => this.executeGraphViewMethod("centerOnSource", "Open the Relationship Graph to center on source"),
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

		this.addCommand({
			id: "nexus-undo",
			name: "Undo",
			callback: async () => {
				const success = await this.commandManager.undo();
				if (success) {
					this.triggerGraphUpdate();
				}
			},
		});

		this.addCommand({
			id: "nexus-redo",
			name: "Redo",
			callback: async () => {
				const success = await this.commandManager.redo();
				if (success) {
					this.triggerGraphUpdate();
				}
			},
		});

		this.addCommand({
			id: "bases-view-forward",
			name: "Bases: Next View",
			callback: () => this.executeViewSwitcherMethod("toggleBasesViewForward"),
		});

		this.addCommand({
			id: "bases-view-backward",
			name: "Bases: Previous View",
			callback: () => this.executeViewSwitcherMethod("toggleBasesViewBackward"),
		});

		void this.initializePlugin();
	}

	private async initializePlugin() {
		this.indexer = new Indexer(this.app, this.settingsStore.settings$);

		this.propertiesManager = new PropertiesManager(this.app, this.settingsStore.settings$);
		this.propertiesManager.start(this.indexer.events$);

		this.nodeCreator = new NodeCreator(this.app, this.settingsStore.settings$, this.commandManager);

		await this.indexer.start();

		this.registerView(VIEW_TYPE_NEXUS_SWITCHER, (leaf) => new NexusViewSwitcher(leaf, this.indexer, this));

		await this.checkForUpdates();
		this.checkTitlePropertySetup();
	}

	override onunload(): void {
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

	private async toggleRelationshipGraphView(): Promise<void> {
		const placement: LeafPlacement =
			this.settingsStore.currentSettings.viewLeafPosition === "right" ? "right-sidebar" : "left-sidebar";
		await activateView(this.app.workspace, {
			viewType: VIEW_TYPE_NEXUS_SWITCHER,
			placement,
		});
	}

	private async toggleViewMode(): Promise<void> {
		const { workspace } = this.app;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_NEXUS_SWITCHER);

		if (existingLeaves.length > 0) {
			const switcherView = existingLeaves[0].view;
			if (switcherView instanceof NexusViewSwitcher) {
				await switcherView.toggleView();
			}
		} else {
			new Notice("Please open the Nexus Properties view first");
		}
	}

	private toggleEnlargement(): void {
		const { workspace } = this.app;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_NEXUS_SWITCHER);

		if (existingLeaves.length > 0) {
			const switcherView = existingLeaves[0].view;
			if (switcherView instanceof NexusViewSwitcher) {
				switcherView.toggleEnlargement();
			}
		} else {
			new Notice("Please open the Nexus Properties view first");
		}
	}

	private executeGraphViewMethod(methodName: string, noticeMessage?: string): void {
		const { workspace } = this.app;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_NEXUS_SWITCHER);

		if (existingLeaves.length > 0) {
			const switcherView = existingLeaves[0].view;
			if (switcherView instanceof NexusViewSwitcher) {
				const graphView = switcherView.getGraphView();
				if (graphView) {
					const method = graphView[methodName as keyof typeof graphView];
					if (typeof method === "function") {
						(method as () => void).call(graphView);
					}
					return;
				}
			}
		}

		if (noticeMessage) {
			new Notice(noticeMessage);
		} else {
			new Notice("Please open the Nexus Properties view in Graph mode first");
		}
	}

	private executeViewSwitcherMethod(methodName: string, noticeMessage?: string): void {
		const { workspace } = this.app;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_NEXUS_SWITCHER);

		if (existingLeaves.length > 0) {
			const switcherView = existingLeaves[0].view;
			if (switcherView instanceof NexusViewSwitcher) {
				const method = switcherView[methodName as keyof NexusViewSwitcher];
				if (typeof method === "function") {
					(method as () => void).call(switcherView);
				}
				return;
			}
		}

		if (noticeMessage) {
			new Notice(noticeMessage);
		} else {
			new Notice("Please open the Nexus Properties view first");
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

		this.showNodeCreationModal(activeFile, type);
		return true;
	}

	private showNodeCreationModal(sourceFile: TFile, type: "parent" | "child" | "related"): void {
		const prefillText = this.nodeCreator.generateAutoNodeName(sourceFile.basename, type);

		const modal = new NodeCreationModal(this.app, type, prefillText, async (nodeName) => {
			await this.createNodeAndOpen(sourceFile, type, nodeName);
		});

		modal.open();
	}

	private async createNodeAndOpen(
		sourceFile: TFile,
		type: "parent" | "child" | "related",
		nodeName: string
	): Promise<void> {
		const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

		try {
			const newFile = await this.nodeCreator.createRelatedNodeWithName(sourceFile, type, nodeName);

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

	private async checkForUpdates(): Promise<void> {
		const currentVersion = this.manifest.version;
		const lastSeenVersion = this.settingsStore.settings$.value.version;

		if (lastSeenVersion !== currentVersion) {
			const config: WhatsNewModalConfig = {
				cssPrefix: "nexus-",
				pluginName: "Nexus Properties",
				changelogContent: CHANGELOG_CONTENT,
				links: {
					github: buildUtmUrl(
						"https://github.com/Real1tyy/Nexus-Properties",
						"nexus-properties",
						"plugin",
						"whats_new",
						"github"
					),
					support: buildUtmUrl(
						"https://matejvavroproductivity.com/support/",
						"nexus-properties",
						"plugin",
						"whats_new",
						"support"
					),
					changelog: buildUtmUrl(
						"https://real1tyy.github.io/Nexus-Properties/changelog",
						"nexus-properties",
						"plugin",
						"whats_new",
						"changelog"
					),
					documentation: buildUtmUrl(
						"https://real1tyy.github.io/Nexus-Properties/",
						"nexus-properties",
						"plugin",
						"whats_new",
						"documentation"
					),
				},
			};

			showWhatsNewReactModal(this.app, this, config, lastSeenVersion, currentVersion);
			await this.settingsStore.updateSettings((settings) => ({
				...settings,
				version: currentVersion,
			}));
		}
	}

	private triggerGraphUpdate(): void {
		const { workspace } = this.app;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_NEXUS_SWITCHER);

		if (existingLeaves.length > 0) {
			const switcherView = existingLeaves[0].view;
			if (switcherView instanceof NexusViewSwitcher) {
				void switcherView.triggerUpdate();
			}
		}
	}

	private checkTitlePropertySetup(): void {
		const titlePropertyMode = this.settingsStore.settings$.value.titlePropertyMode;

		if (titlePropertyMode === "unknown") {
			new TitlePropertySetupModal(this.app, {
				onEnable: () => {
					void (async () => {
						await this.settingsStore.updateSettings((settings) => ({
							...settings,
							titlePropertyMode: "enabled",
						}));
						new Notice("✅ Title property enabled. Running initial scan...");
						await this.triggerFullRescan();
						new Notice("✅ Title properties have been added to all indexed files.");
					})();
				},
				onDisable: () => {
					void (async () => {
						await this.settingsStore.updateSettings((settings) => ({
							...settings,
							titlePropertyMode: "disabled",
						}));
						new Notice("Title property disabled. File names will be used in Bases view.");
					})();
				},
			}).open();
		}
	}
}
