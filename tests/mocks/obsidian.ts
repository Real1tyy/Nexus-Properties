import { vi } from "vitest";

export class Plugin {
	app: any;
	manifest: any;

	constructor(app: any, manifest: any) {
		this.app = app;
		this.manifest = manifest;
	}

	loadData(): Promise<any> {
		return Promise.resolve({});
	}

	saveData(_data: any): Promise<void> {
		return Promise.resolve();
	}
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
	contentEl: HTMLElement;

	constructor(app: any) {
		this.app = app;
		this.contentEl = document.createElement("div");
	}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

export class Setting {
	private settingEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.settingEl = document.createElement("div");
		containerEl.appendChild(this.settingEl);
	}

	setName(_name: string): this {
		return this;
	}

	setDesc(_desc: string): this {
		return this;
	}

	addText(_cb: (text: any) => void): this {
		return this;
	}

	addTextArea(_cb: (textarea: any) => void): this {
		return this;
	}

	addToggle(_cb: (toggle: any) => void): this {
		return this;
	}

	addDropdown(_cb: (dropdown: any) => void): this {
		return this;
	}
}

export class TFile {
	path: string;
	basename: string;
	extension: string;
	stat: { mtime: number };

	constructor(path: string) {
		this.path = path;
		this.basename = path.split("/").pop()?.replace(/\.md$/, "") || "";
		this.extension = "md";
		this.stat = { mtime: Date.now() };
	}
}

export class Vault {
	on = vi.fn();
	off = vi.fn();
	getMarkdownFiles = vi.fn(() => []);
	read = vi.fn(() => Promise.resolve(""));
	modify = vi.fn(() => Promise.resolve());
}

export class MetadataCache {
	on = vi.fn();
	off = vi.fn();
	getFileCache = vi.fn(() => null);
}

/**
 * Normalizes a file path using Obsidian's path normalization rules.
 * This is a simplified mock version that handles basic path normalization.
 */
export function normalizePath(path: string): string {
	if (!path) return "";

	// Convert backslashes to forward slashes
	let normalized = path.replace(/\\/g, "/");

	// Remove duplicate slashes
	normalized = normalized.replace(/\/+/g, "/");

	// Remove trailing slash
	normalized = normalized.replace(/\/$/, "");

	// Remove leading ./
	normalized = normalized.replace(/^\.\//, "");

	// Normalize to lowercase for case-insensitive comparison (Obsidian behavior)
	normalized = normalized.toLowerCase();

	return normalized;
}
