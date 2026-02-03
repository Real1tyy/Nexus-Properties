import { RegisteredEventsComponent, renderPropertyValue, type PropertyRendererConfig } from "@real1ty-obsidian-plugins";
import { type App, Component, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { Indexer } from "../../core/indexer";
import { HierarchyProvider, type HierarchySourceType } from "../../core/hierarchy";
import type NexusPropertiesPlugin from "../../main";
import type { NexusPropertiesSettings } from "../../types/settings";
import { cls } from "../../utils/css";
import { type TreeNode } from "../../utils/hierarchy";

export class MocView extends RegisteredEventsComponent {
	private settingsSubscription: Subscription | null = null;
	private currentSettings: NexusPropertiesSettings;
	private lastFilePath: string | null = null;
	private isUpdating = false;
	private collapsedNodes: Set<string> = new Set();
	private treeContainer: HTMLElement | null = null;
	private useTopParentAsRoot = false;
	private rootModeBtn: HTMLButtonElement | null = null;
	private component: Component;

	constructor(
		private app: App,
		private contentEl: HTMLElement,
		private plugin: NexusPropertiesPlugin,
		private indexer: Indexer,
		private hierarchySource: HierarchySourceType
	) {
		super();
		this.component = new Component();
		this.component.load();
		this.currentSettings = plugin.settingsStore.currentSettings;

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe((settings) => {
			this.currentSettings = settings;
			this.lastFilePath = null;
			this.render();
		});
	}

	async render(): Promise<void> {
		if (this.isUpdating) {
			return;
		}

		this.isUpdating = true;

		try {
			const activeFile = this.app.workspace.getActiveFile();
			const currentFilePath = activeFile?.path || "";

			if (currentFilePath === this.lastFilePath && currentFilePath !== "") {
				return;
			}

			this.lastFilePath = currentFilePath;

			this.contentEl.empty();
			this.contentEl.addClass(cls("moc-view"));

			if (!activeFile) {
				this.renderEmptyState("No active file. Open a note to see its MOC view.");
				return;
			}

			this.createToolbar();
			this.treeContainer = this.contentEl.createDiv({
				cls: cls("moc-tree-container"),
			});

			const provider = HierarchyProvider.getInstance(this.app, this.indexer, this.plugin.settingsStore);

			const options = {
				prioritizeParentProp: this.currentSettings.prioritizeParentProp,
				mocFilePath: activeFile.path,
			};

			const tree = this.useTopParentAsRoot
				? await provider.buildTreeFromTopParent(activeFile, this.hierarchySource, options)
				: await provider.buildTree(activeFile, this.hierarchySource, options);
			this.renderTree(tree, this.treeContainer, 0);
		} finally {
			this.isUpdating = false;
		}
	}

	private createToolbar(): void {
		const toolbar = this.contentEl.createDiv({
			cls: cls("moc-toolbar"),
		});

		const leftGroup = toolbar.createDiv({
			cls: cls("moc-toolbar-group"),
		});

		const expandAllBtn = leftGroup.createEl("button", {
			text: "Expand All",
			cls: cls("moc-toolbar-btn"),
		});
		expandAllBtn.addEventListener("click", () => this.expandAll());

		const collapseAllBtn = leftGroup.createEl("button", {
			text: "Collapse All",
			cls: cls("moc-toolbar-btn"),
		});
		collapseAllBtn.addEventListener("click", () => this.collapseAll());

		const rightGroup = toolbar.createDiv({
			cls: cls("moc-toolbar-group"),
		});

		this.rootModeBtn = rightGroup.createEl("button", {
			cls: `${cls("moc-toolbar-btn")} ${cls("moc-root-toggle")} ${this.useTopParentAsRoot ? cls("moc-root-toggle-active") : ""}`,
		});
		this.updateRootModeButton();
		this.rootModeBtn.addEventListener("click", () => this.toggleRootMode());
	}

	private updateRootModeButton(): void {
		if (!this.rootModeBtn) return;

		const icon = this.useTopParentAsRoot ? this.getTreeIcon() : this.getFileIcon();
		const text = this.useTopParentAsRoot ? "Top Parent" : "Current";

		this.rootModeBtn.innerHTML = `${icon}<span>${text}</span>`;

		if (this.useTopParentAsRoot) {
			this.rootModeBtn.addClass(cls("moc-root-toggle-active"));
		} else {
			this.rootModeBtn.removeClass(cls("moc-root-toggle-active"));
		}
	}

	private toggleRootMode(): void {
		this.useTopParentAsRoot = !this.useTopParentAsRoot;
		this.updateRootModeButton();
		this.lastFilePath = null;
		this.render();
	}

	private getTreeIcon(): string {
		return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`;
	}

	private getFileIcon(): string {
		return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
	}

	private renderTree(node: TreeNode, container: HTMLElement, depth: number): void {
		const itemEl = container.createDiv({
			cls: cls("moc-item"),
		});
		itemEl.dataset.depth = depth.toString();
		itemEl.dataset.path = node.path;

		const headerEl = itemEl.createDiv({
			cls: cls("moc-item-header"),
		});

		// Toggle button (only if has children)
		if (node.children.length > 0) {
			const toggleBtn = headerEl.createDiv({
				cls: cls("moc-toggle"),
			});
			const isCollapsed = this.collapsedNodes.has(node.path);
			toggleBtn.innerHTML = isCollapsed ? this.getChevronRight() : this.getChevronDown();
			toggleBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggleNode(node.path, itemEl, toggleBtn);
			});
		} else {
			headerEl.createDiv({
				cls: cls("moc-toggle-spacer"),
			});
		}

		// Link
		const linkClasses = [cls("moc-link")];
		if (node.isCurrentFile) {
			linkClasses.push(cls("moc-link-current"));
		}
		const linkEl = headerEl.createEl("a", {
			cls: linkClasses.join(" "),
			text: node.name,
		});
		linkEl.addEventListener("click", (e) => {
			e.preventDefault();
			const file = this.app.vault.getAbstractFileByPath(node.path);
			if (file instanceof TFile) {
				// Ctrl/Cmd+click: open in new tab
				if (e.ctrlKey || e.metaKey) {
					this.app.workspace.getLeaf("tab").openFile(file);
				} else {
					this.app.workspace.getLeaf(false).openFile(file);
				}
			}
		});

		// Render display properties
		const displayProps = this.currentSettings.mocDisplayProperties;
		if (displayProps.length > 0) {
			const file = this.app.vault.getAbstractFileByPath(node.path);
			if (file instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(file);
				const frontmatter = cache?.frontmatter;
				if (frontmatter) {
					const propsContainer = headerEl.createDiv({
						cls: cls("moc-properties"),
					});
					this.renderProperties(propsContainer, frontmatter, displayProps, file);
				}
			}
		}

		// Children container
		if (node.children.length > 0) {
			const childrenEl = itemEl.createDiv({
				cls: cls("moc-children"),
			});

			if (this.collapsedNodes.has(node.path)) {
				childrenEl.style.display = "none";
			}

			for (const child of node.children) {
				this.renderTree(child, childrenEl, depth + 1);
			}
		}
	}

	private toggleNode(path: string, itemEl: HTMLElement, toggleBtn: HTMLElement): void {
		const childrenEl = itemEl.querySelector(`:scope > .${cls("moc-children")}`) as HTMLElement;
		if (!childrenEl) return;

		if (this.collapsedNodes.has(path)) {
			this.collapsedNodes.delete(path);
			childrenEl.style.display = "";
			toggleBtn.innerHTML = this.getChevronDown();
		} else {
			this.collapsedNodes.add(path);
			childrenEl.style.display = "none";
			toggleBtn.innerHTML = this.getChevronRight();
		}
	}

	private expandAll(): void {
		this.collapsedNodes.clear();

		const toggles = this.contentEl.querySelectorAll(`.${cls("moc-toggle")}`);
		toggles.forEach((toggle) => {
			toggle.innerHTML = this.getChevronDown();
		});

		const children = this.contentEl.querySelectorAll(`.${cls("moc-children")}`);
		children.forEach((child) => {
			(child as HTMLElement).style.display = "";
		});
	}

	private collapseAll(): void {
		const items = this.contentEl.querySelectorAll(`.${cls("moc-item")}`);
		items.forEach((item) => {
			const path = (item as HTMLElement).dataset.path;
			const childrenEl = item.querySelector(`:scope > .${cls("moc-children")}`);
			if (childrenEl && path) {
				this.collapsedNodes.add(path);
				(childrenEl as HTMLElement).style.display = "none";
			}
		});

		const toggles = this.contentEl.querySelectorAll(`.${cls("moc-toggle")}`);
		toggles.forEach((toggle) => {
			toggle.innerHTML = this.getChevronRight();
		});
	}

	private getChevronDown(): string {
		return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
	}

	private getChevronRight(): string {
		return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
	}

	private renderEmptyState(message: string): void {
		this.contentEl.createDiv({
			text: message,
			cls: cls("moc-empty-state"),
		});
	}

	private renderProperties(
		container: HTMLElement,
		frontmatter: Record<string, unknown>,
		propertyNames: string[],
		file: TFile
	): void {
		const config: PropertyRendererConfig = {
			createLink: (text, path) => {
				const link = document.createElement("a");
				link.textContent = text;
				link.className = cls("moc-property-link");
				link.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.app.workspace.openLinkText(path, file.path, true);
				});
				return link;
			},
			createText: (text) => {
				const span = document.createElement("span");
				span.textContent = text;
				span.className = cls("moc-property-text");
				return span;
			},
			createSeparator: () => {
				const span = document.createElement("span");
				span.textContent = ", ";
				span.className = cls("moc-property-separator");
				return span;
			},
		};

		for (const propName of propertyNames) {
			const value = frontmatter[propName];
			if (value === undefined || value === null) continue;

			const propEl = container.createDiv({
				cls: cls("moc-property"),
			});

			renderPropertyValue(propEl, value, config);
		}
	}

	async updateActiveFile(): Promise<void> {
		this.lastFilePath = null;
		await this.render();
	}

	destroy(): void {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}
		if (this.component) {
			this.component.unload();
		}
		this.lastFilePath = null;
		this.isUpdating = false;
		this.collapsedNodes.clear();
		this.treeContainer = null;
		this.rootModeBtn = null;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
