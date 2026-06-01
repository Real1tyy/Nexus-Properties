// Typed surfaces for Nexus-Properties' renderer-side runtime objects, used
// inside `page.evaluate(...)` callbacks. The base `ObsidianWindow` comes from
// the shared library; `NexusWindow` extends it with the workspace + vault
// fields specs touch, so callbacks cast once instead of re-typing them.
//
// Maintenance contract: every renderer-side shape an e2e helper needs lives
// here. Do NOT re-declare a local `RendererWindow` next to an evaluate call.

import type { ObsidianWindow as BaseObsidianWindow } from "@real1ty-obsidian-plugins/testing/e2e";

export type { BaseObsidianWindow as ObsidianWindow };

export interface NexusPlugin {
	manifest?: { version?: string; id?: string };
	settingsStore?: {
		currentSettings: Record<string, unknown>;
		settings$?: unknown;
		updateSettings: (updater: (s: Record<string, unknown>) => Record<string, unknown>) => Promise<void>;
	};
	indexer?: {
		shouldIndexFile: (filePath: string) => boolean;
		scanAllFiles: () => Promise<void>;
		getRelationshipsSnapshot: () => ReadonlyMap<string, unknown>;
	};
	propertiesManager?: unknown;
	nodeCreator?: unknown;
	commandManager?: {
		undo: () => Promise<boolean>;
		redo: () => Promise<boolean>;
		executeCommand: (cmd: unknown) => Promise<void>;
	};
	triggerFullRescan?: () => Promise<void>;
}

export interface NexusWindow extends Omit<BaseObsidianWindow, "app"> {
	app: Omit<BaseObsidianWindow["app"], "workspace" | "vault" | "plugins"> & {
		workspace: Omit<BaseObsidianWindow["app"]["workspace"], "openLinkText"> & {
			openLinkText: (link: string, src: string, newLeaf?: boolean) => Promise<void>;
			getActiveFile: () => { path: string } | null;
			getLeaf: (newLeaf: boolean | "tab" | "split") => { openFile: (f: unknown) => Promise<void> };
			getLeavesOfType: (type: string) => Array<{ view: unknown }>;
			onLayoutReady: (cb: () => void) => void;
		};
		vault: {
			adapter?: { basePath?: string; exists: (path: string) => Promise<boolean> };
			getMarkdownFiles: () => Array<{ path: string }>;
			getAbstractFileByPath: (path: string) => unknown;
			create: (path: string, content: string) => Promise<unknown>;
			createFolder: (path: string) => Promise<void>;
			read: (file: unknown) => Promise<string>;
			modify: (file: unknown, content: string) => Promise<void>;
			rename: (file: unknown, newPath: string) => Promise<void>;
			delete: (file: unknown) => Promise<void>;
		};
		plugins: BaseObsidianWindow["app"]["plugins"];
		commands: Omit<BaseObsidianWindow["app"]["commands"], "commands"> & {
			commands: Record<string, { name: string } | undefined>;
		};
		metadataCache: {
			getFileCache: (file: { path: string }) => { frontmatter?: Record<string, unknown> } | null;
		};
		fileManager: {
			processFrontMatter: (file: unknown, fn: (fm: Record<string, unknown>) => void) => Promise<void>;
		};
	};
}
