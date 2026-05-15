import {
	getFolderPath,
	isFolderNote,
	type PropertyRendererConfig,
	RegisteredEventsComponent,
	renderPropertyValue,
} from "@real1ty-obsidian-plugins";
import { type App, Component, TFile } from "obsidian";
import type { Subscription } from "rxjs";

import { cls } from "../../constants";
import { HierarchyProvider, type HierarchySourceType } from "../../core/hierarchy";
import type { Indexer } from "../../core/indexer";
import type NexusPropertiesPlugin from "../../main";
import type { NexusPropertiesSettings } from "../../types/settings";
import { type ParentOption, resolveDisplayName, resolveParentSelection } from "../../utils/file-utils";
import { buildRelatedTree, type TreeNode } from "../../utils/hierarchy";
import { MocSearch } from "../input-managers/moc-search";

export class MocView extends RegisteredEventsComponent {
	private settingsSubscription: Subscription | null = null;
	private currentSettings: NexusPropertiesSettings;
	private lastFilePath: string | null = null;
	private isUpdating = false;
	private collapsedNodes: Set<string> = new Set();
	private treeContainer: HTMLElement | null = null;
	private useTopParentAsRoot = false;
	private showRelated = false;
	private rootModeBtn: HTMLButtonElement | null = null;
	private parentOverridePath: string | undefined;
	private parentDropdown: HTMLSelectElement | null = null;
	private parentSelectorContainer: HTMLElement | null = null;
	private mocSearch: MocSearch | null = null;
	private searchRowEl: HTMLElement | null = null;
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
			void this.render();
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

			// Reset parent override only on actual file switch (not forced re-renders)
			if (this.lastFilePath !== null && this.lastFilePath !== currentFilePath) {
				this.parentOverridePath = undefined;
			}

			this.lastFilePath = currentFilePath;

			// Detach search row before emptying so we can reuse it
			const hadSearchFocus = this.searchRowEl?.contains(document.activeElement) ?? false;
			if (this.searchRowEl) {
				this.searchRowEl.detach();
			}

			this.contentEl.empty();
			this.contentEl.addClass(cls("moc-view"));

			if (!activeFile) {
				this.renderEmptyState("No active file. Open a note to see its MOC view.");
				return;
			}

			const isFolder = isFolderNote(activeFile.path);
			this.createToolbar(isFolder);

			// Create search row once, reuse across re-renders
			if (!this.mocSearch) {
				this.searchRowEl = createDiv({ cls: cls("moc-search-row") });
				this.mocSearch = new MocSearch(this.searchRowEl, () => {
					this.lastFilePath = null;
					void this.render();
				});
			}
			this.contentEl.appendChild(this.searchRowEl!);

			// Compute parents and populate dropdown
			const { parents, selectedPath } = resolveParentSelection({
				app: this.app,
				indexer: this.indexer,
				file: activeFile,
				prioritizeParentProp: this.currentSettings.prioritizeParentProp,
				overridePath: this.parentOverridePath,
			});
			this.populateParentDropdown(parents, selectedPath);

			// Hide dropdown when: showRelated, folder note, moc-content mode, or fewer than 2 parents
			const shouldHideParent =
				this.showRelated || isFolder || this.hierarchySource === "moc-content" || parents.length < 2;
			if (this.parentSelectorContainer) {
				this.parentSelectorContainer.toggleClass(cls("hidden"), shouldHideParent);
			}

			this.treeContainer = this.contentEl.createDiv({
				cls: cls("moc-tree-container"),
			});

			const provider = HierarchyProvider.getInstance(this.app, this.indexer, this.plugin.settingsStore);

			if (isFolder) {
				await this.renderFolderForest(activeFile, provider);
			} else {
				await this.renderSingleTree(activeFile, provider);
			}

			if (hadSearchFocus) {
				this.mocSearch.focus();
			}
		} finally {
			this.isUpdating = false;
		}
	}

	private async renderSingleTree(activeFile: TFile, provider: HierarchyProvider): Promise<void> {
		let tree: TreeNode;

		if (this.showRelated) {
			// Related mode: build tree purely from related properties (no children hierarchy)
			tree = buildRelatedTree(this.app, this.indexer, activeFile);
		} else {
			const options = {
				prioritizeParentProp: this.currentSettings.prioritizeParentProp,
				mocFilePath: activeFile.path,
				parentOverridePath: this.parentOverridePath,
			};

			tree = this.useTopParentAsRoot
				? await provider.buildTreeFromTopParent(activeFile, this.hierarchySource, options)
				: await provider.buildTree(activeFile, this.hierarchySource, options);
		}

		const query = this.mocSearch?.getCurrentValue() ?? "";
		if (query) {
			const filtered = this.filterTree(tree, query);
			for (const node of filtered) {
				this.renderTree(node, this.treeContainer!, 0);
			}
		} else {
			this.renderTree(tree, this.treeContainer!, 0);
		}
	}

	private async renderFolderForest(folderNoteFile: TFile, provider: HierarchyProvider): Promise<void> {
		const folderPath = getFolderPath(folderNoteFile.path);
		const allFiles = this.app.vault.getMarkdownFiles();

		// Get all files in folder + subfolders, excluding the folder note itself
		const filesInFolder = allFiles.filter((file) => {
			if (file.path === folderNoteFile.path) return false;
			const fileFolder = getFolderPath(file.path);
			return fileFolder === folderPath || fileFolder.startsWith(`${folderPath}/`);
		});

		const processedPaths = new Set<string>();

		for (const file of filesInFolder) {
			if (processedPaths.has(file.path)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			let tree: TreeNode;

			if (this.showRelated) {
				// Related mode: build tree purely from related properties (no children hierarchy)
				tree = buildRelatedTree(this.app, this.indexer, file);
			} else {
				// Hierarchy mode: build from top parent
				const options = {
					prioritizeParentProp: this.currentSettings.prioritizeParentProp,
					mocFilePath: file.path,
					highlightPath: "", // No highlighting in folder forest (all nodes equal)
				};
				tree = await provider.buildTreeFromTopParent(file, this.hierarchySource, options);
			}

			// Collect all paths in this tree to avoid duplicating shared subtrees
			this.collectTreePaths(tree, processedPaths);

			const query = this.mocSearch?.getCurrentValue() ?? "";
			if (query) {
				const filtered = this.filterTree(tree, query);
				for (const node of filtered) {
					this.renderTree(node, this.treeContainer!, 0);
				}
			} else {
				this.renderTree(tree, this.treeContainer!, 0);
			}
		}
	}

	private collectTreePaths(node: TreeNode, paths: Set<string>): void {
		paths.add(node.path);
		for (const child of node.children) {
			this.collectTreePaths(child, paths);
		}
	}

	private filterTree(node: TreeNode, query: string): TreeNode[] {
		const filteredChildren: TreeNode[] = [];
		for (const child of node.children) {
			filteredChildren.push(...this.filterTree(child, query));
		}

		const displayName = resolveDisplayName(this.app, node.path, this.currentSettings.titleProp);
		if (this.mocSearch?.shouldInclude(displayName)) {
			return [{ ...node, children: filteredChildren }];
		} else if (filteredChildren.length > 0) {
			// Re-parent: promote children of non-matching intermediate nodes
			return filteredChildren;
		}
		return [];
	}

	private createToolbar(isFolder = false): void {
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

		const relatedContainer = rightGroup.createDiv({
			cls: cls("moc-toggle-container"),
		});
		const relatedCheckbox = relatedContainer.createEl("input", {
			type: "checkbox",
		});
		relatedCheckbox.addClass(cls("moc-toggle-checkbox"));
		relatedCheckbox.checked = this.showRelated;
		relatedContainer.createEl("label", {
			text: "Render Related",
			cls: cls("moc-toggle-label"),
		});
		relatedCheckbox.addEventListener("change", () => {
			this.showRelated = relatedCheckbox.checked;
			this.lastFilePath = null;
			void this.render();
		});
		relatedContainer.style.cursor = "pointer";
		relatedContainer.addEventListener("click", (e) => {
			if (e.target === relatedCheckbox) return;
			relatedCheckbox.click();
		});

		// Parent override dropdown
		this.parentSelectorContainer = rightGroup.createDiv({
			cls: cls("moc-toggle-container"),
		});
		this.parentDropdown = this.parentSelectorContainer.createEl("select", {
			cls: cls("moc-parent-dropdown"),
		});
		this.parentDropdown.addEventListener("change", () => {
			this.parentOverridePath = this.parentDropdown?.value;
			this.lastFilePath = null;
			void this.render();
		});

		// Root mode toggle is not applicable for folder notes (forest always uses top parent)
		if (!isFolder) {
			this.rootModeBtn = rightGroup.createEl("button", {
				cls: `${cls("moc-toolbar-btn")} ${cls("moc-root-toggle")} ${this.useTopParentAsRoot ? cls("moc-root-toggle-active") : ""}`,
			});
			this.updateRootModeButton();
			this.rootModeBtn.addEventListener("click", () => this.toggleRootMode());
		}
	}

	private populateParentDropdown(parents: ParentOption[], selectedPath: string | undefined): void {
		if (!this.parentDropdown) return;
		this.parentDropdown.empty();

		for (const parent of parents) {
			const option = this.parentDropdown.createEl("option", {
				text: parent.displayName,
				value: parent.path,
			});
			if (parent.path === selectedPath) {
				option.selected = true;
			}
		}
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
		void this.render();
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
		itemEl.dataset["depth"] = depth.toString();
		itemEl.dataset["path"] = node.path;

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

		const displayName = resolveDisplayName(this.app, node.path, this.currentSettings.titleProp);
		const linkClasses = [cls("moc-link")];
		if (node.isCurrentFile) {
			linkClasses.push(cls("moc-link-current"));
		}
		const linkEl = headerEl.createEl("a", {
			cls: linkClasses.join(" "),
			text: displayName,
		});
		linkEl.addEventListener("click", (e) => {
			e.preventDefault();
			const file = this.app.vault.getAbstractFileByPath(node.path);
			if (file instanceof TFile) {
				// Ctrl/Cmd+click: open in new tab
				if (e.ctrlKey || e.metaKey) {
					void this.app.workspace.getLeaf("tab").openFile(file);
				} else {
					void this.app.workspace.getLeaf(false).openFile(file);
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
			const path = (item as HTMLElement).dataset["path"];
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
					void this.app.workspace.openLinkText(path, file.path, true);
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
		this.component.unload();
		this.mocSearch?.destroy();
		this.mocSearch = null;
		this.searchRowEl = null;
		this.lastFilePath = null;
		this.isUpdating = false;
		this.collapsedNodes.clear();
		this.treeContainer = null;
		this.rootModeBtn = null;
		this.parentDropdown = null;
		this.parentSelectorContainer = null;
		this.parentOverridePath = undefined;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
