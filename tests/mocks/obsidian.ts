import { vi } from "vitest";

export class Plugin {
	app: any;
	manifest: any;
	settings: any;

	constructor(app: any, manifest: any) {
		this.app = app;
		this.manifest = manifest;
	}

	addSettingTab = vi.fn();
	registerEvent = vi.fn();
	loadData = vi.fn().mockResolvedValue({});
	saveData = vi.fn().mockResolvedValue(undefined);
	onload = vi.fn();
	onunload = vi.fn();
	addRibbonIcon = vi.fn();
	addStatusBarItem = vi.fn();
	addCommand = vi.fn();
	removeCommand = vi.fn();
	registerDomEvent = vi.fn();
	registerInterval = vi.fn();
	registerView = vi.fn();
	addChild = vi.fn();
	removeChild = vi.fn();
	register = vi.fn();
	load = vi.fn();
	unload = vi.fn();
}

export class PluginSettingTab {
	app: any;
	plugin: any;
	containerEl: HTMLElement;

	constructor(app: any, plugin: any) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}

	display(): void {}
	hide(): void {}
}

export class Modal {
	app: any;
	containerEl: HTMLElement;
	titleEl: HTMLElement;
	contentEl: HTMLElement;

	constructor(app: any) {
		this.app = app;
		this.containerEl = document.createElement("div");
		this.titleEl = document.createElement("div");
		this.contentEl = document.createElement("div");
	}

	open = vi.fn();
	close = vi.fn();
	onOpen = vi.fn();
	onClose = vi.fn();
}

export class SuggestModal<T> extends Modal {
	setPlaceholder = vi.fn();
	setInstructions = vi.fn();
	getSuggestions(_query: string): T[] {
		return [];
	}
	renderSuggestion(_item: T, _el: HTMLElement): void {}
	onChooseSuggestion(_item: T, _evt: MouseEvent | KeyboardEvent): void {}
}

export class Setting {
	settingEl: HTMLElement;
	nameEl: HTMLElement;
	descEl: HTMLElement;
	controlEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.settingEl = document.createElement("div");
		this.nameEl = document.createElement("div");
		this.descEl = document.createElement("div");
		this.controlEl = document.createElement("div");
		containerEl.appendChild(this.settingEl);
	}

	setName = vi.fn().mockReturnThis();
	setDesc = vi.fn().mockReturnThis();
	addText = vi.fn().mockReturnThis();
	addTextArea = vi.fn().mockReturnThis();
	addToggle = vi.fn().mockReturnThis();
	addDropdown = vi.fn().mockReturnThis();
	addButton = vi.fn().mockReturnThis();
	addSlider = vi.fn().mockReturnThis();
}

export class TFolder {
	path: string;
	name: string;
	children: any[];
	vault: any;
	parent: TFolder | null;

	constructor(path: string) {
		this.path = path;
		this.name = path.split("/").pop() || "";
		this.children = [];
		this.vault = {};
		this.parent = null;
	}

	isRoot(): boolean {
		return this.path === "" || this.path === "/";
	}
}

export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	stat: { mtime: number; ctime: number; size: number };
	vault: any;
	parent: TFolder | null;

	constructor(path: string, parentPath?: string) {
		this.path = path;
		this.name = path.split("/").pop() || "";
		this.basename = this.name.replace(/\.[^/.]+$/, "");
		this.extension = path.split(".").pop() || "md";
		this.stat = { mtime: Date.now(), ctime: Date.now(), size: 0 };
		this.vault = {};

		if (parentPath !== undefined) {
			this.parent = parentPath ? new TFolder(parentPath) : null;
		} else {
			const lastSlash = path.lastIndexOf("/");
			if (lastSlash > 0) {
				this.parent = new TFolder(path.substring(0, lastSlash));
			} else {
				this.parent = null;
			}
		}
	}
}

/**
 * Normalizes a file path. Lowercases output to match the existing test fixtures
 * that pre-lowercase keys in their own file maps (see folder-notes-graph.test.ts).
 * This deviates from Obsidian's real normalizePath, which preserves case.
 */
export function normalizePath(p: string): string {
	if (!p) return "";
	let normalized = p.replace(/\\/g, "/");
	normalized = normalized.replace(/\/+/g, "/");
	normalized = normalized.replace(/\/$/, "");
	normalized = normalized.replace(/^\.\//, "");
	normalized = normalized.toLowerCase();
	return normalized;
}

export class WorkspaceLeaf {
	view: any;
	openFile = vi.fn();
	setViewState = vi.fn();
	getViewState = vi.fn();
}

export class ItemView {
	app: any;
	leaf: any;
	containerEl: HTMLElement;
	contentEl: HTMLElement;

	constructor(leaf: any) {
		this.leaf = leaf;
		this.app = leaf?.app;
		this.containerEl = document.createElement("div");
		this.contentEl = document.createElement("div");
	}

	getViewType(): string {
		return "mock-view";
	}

	getDisplayText(): string {
		return "Mock View";
	}

	getIcon(): string {
		return "mock-icon";
	}

	getState = vi.fn().mockReturnValue({});
	setState = vi.fn().mockResolvedValue(undefined);
}

export const Notice = vi.fn();

export class Menu {
	addItem(callback: (item: any) => void) {
		const item = {
			setTitle: vi.fn().mockReturnThis(),
			setIcon: vi.fn().mockReturnThis(),
			onClick: vi.fn().mockReturnThis(),
			setSection: vi.fn().mockReturnThis(),
		};
		callback(item);
		return this;
	}
	addSeparator() {
		return this;
	}
	showAtMouseEvent() {}
	showAtPosition() {}
}

export const Platform = {
	isDesktopApp: true,
	isMobileApp: false,
	isMacOS: false,
	isWin: false,
	isLinux: true,
	isIosApp: false,
	isAndroidApp: false,
};

export const apiVersion = "1.8.0";
export const requestUrl = vi.fn();
export const App = vi.fn();

export function setIcon(_el: HTMLElement, _iconId: string): void {}

export const MarkdownRenderer = {
	render: vi.fn().mockResolvedValue(undefined),
};

export class Component {
	load = vi.fn();
	unload = vi.fn();
	onload = vi.fn();
	onunload = vi.fn();
	addChild = vi.fn();
	removeChild = vi.fn();
	register = vi.fn();
}

export class AbstractInputSuggest<T> {
	app: any;
	textInputEl: HTMLInputElement | HTMLDivElement;
	limit = 100;

	constructor(app: any, textInputEl: HTMLInputElement | HTMLDivElement) {
		this.app = app;
		this.textInputEl = textInputEl;
	}

	getSuggestions(_query: string): T[] | Promise<T[]> {
		return [];
	}

	renderSuggestion(_value: T, _el: HTMLElement): void {}
	selectSuggestion(_value: T): void {}

	close = vi.fn();
	open = vi.fn();
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number, immediate?: boolean): T {
	let timeout: number | null = null;
	return ((...args: Parameters<T>) => {
		const later = () => {
			timeout = null;
			if (!immediate) func(...args);
		};
		const callNow = immediate && !timeout;
		if (timeout !== null) window.clearTimeout(timeout);
		timeout = window.setTimeout(later, wait);
		if (callNow) func(...args);
	}) as T;
}

export interface MockApp {
	fileManager: {
		processFrontMatter: ReturnType<typeof vi.fn>;
		renameFile: ReturnType<typeof vi.fn>;
	};
	metadataCache: {
		getFileCache: ReturnType<typeof vi.fn>;
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
		offref: ReturnType<typeof vi.fn>;
		getFirstLinkpathDest: ReturnType<typeof vi.fn>;
	};
	vault: {
		getAbstractFileByPath: ReturnType<typeof vi.fn>;
		getFileByPath: ReturnType<typeof vi.fn>;
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
		read: ReturnType<typeof vi.fn>;
		cachedRead: ReturnType<typeof vi.fn>;
		modify: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		delete: ReturnType<typeof vi.fn>;
		rename: ReturnType<typeof vi.fn>;
		getFiles: ReturnType<typeof vi.fn>;
		getMarkdownFiles: ReturnType<typeof vi.fn>;
		getFolderByPath: ReturnType<typeof vi.fn>;
	};
	workspace: {
		getActiveFile: ReturnType<typeof vi.fn>;
		getLeavesOfType: ReturnType<typeof vi.fn>;
		on: ReturnType<typeof vi.fn>;
		onLayoutReady: ReturnType<typeof vi.fn>;
	};
}

export function createMockApp(): MockApp {
	return {
		fileManager: {
			processFrontMatter: vi.fn(),
			renameFile: vi.fn().mockResolvedValue(undefined),
		},
		metadataCache: {
			getFileCache: vi.fn(),
			on: vi.fn().mockReturnValue({ id: "mock-event-ref" }),
			off: vi.fn(),
			offref: vi.fn(),
			getFirstLinkpathDest: vi.fn(),
		},
		vault: {
			getAbstractFileByPath: vi.fn(),
			getFileByPath: vi.fn(),
			on: vi.fn(),
			off: vi.fn(),
			read: vi.fn(),
			cachedRead: vi.fn(),
			modify: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			rename: vi.fn().mockResolvedValue(undefined),
			getFiles: vi.fn().mockReturnValue([]),
			getMarkdownFiles: vi.fn().mockReturnValue([]),
			getFolderByPath: vi.fn(),
		},
		workspace: {
			getActiveFile: vi.fn(),
			getLeavesOfType: vi.fn().mockReturnValue([]),
			on: vi.fn(),
			onLayoutReady: vi.fn((cb: () => void) => cb()),
		},
	};
}

export function createMockFile(
	path: string,
	options?: {
		basename?: string;
		parentPath?: string;
		extension?: string;
		mtime?: number;
	}
): TFile {
	const file = new TFile(path, options?.parentPath);
	if (options?.basename) file.basename = options.basename;
	if (options?.extension) file.extension = options.extension;
	if (options?.mtime !== undefined) file.stat.mtime = options.mtime;
	return file;
}
