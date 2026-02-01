import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NexusPropertiesSettings } from "../../src/types/settings";

// Must mock obsidian before importing anything that uses it
// The mock factory cannot reference external variables (hoisted issue)
vi.mock("obsidian", () => {
	class MockTFile {
		path: string;
		extension = "md";
		constructor(path: string) {
			this.path = path;
		}
	}
	return {
		TFile: MockTFile,
	};
});

// Mock @real1ty-obsidian-plugins
vi.mock("@real1ty-obsidian-plugins", () => ({
	addLinkToProperty: vi.fn((current, path) => {
		const arr = Array.isArray(current) ? [...current] : current ? [current] : [];
		arr.push(`[[${path}]]`);
		return arr;
	}),
	removeLinkFromProperty: vi.fn((current, path) => {
		if (!current) return [];
		const arr = Array.isArray(current) ? [...current] : [current];
		return arr.filter((item: string) => !item.includes(path));
	}),
	hasLinkInProperty: vi.fn((current, path) => {
		if (!current) return false;
		const arr = Array.isArray(current) ? current : [current];
		return arr.some((item: string) => item.includes(path));
	}),
	removeMarkdownExtension: vi.fn((path) => path.replace(/\.md$/, "")),
}));

// Import after mocking
import { AddRelationshipCommand } from "../../src/core/commands/add-relationship-command";
import { RemoveRelationshipCommand } from "../../src/core/commands/remove-relationship-command";
import { TFile } from "obsidian";

function createMockApp(fileExists = true): any {
	return {
		vault: {
			getAbstractFileByPath: vi.fn((path: string) => {
				if (!fileExists) return null;
				// Create an instance that will pass instanceof TFile
				const file = Object.create(TFile.prototype);
				file.path = path;
				file.extension = "md";
				return file;
			}),
		},
		fileManager: {
			processFrontMatter: vi.fn(async (_file, callback) => {
				const fm: Record<string, any> = {};
				callback(fm);
				return fm;
			}),
		},
		metadataCache: {
			getFileCache: vi.fn(() => ({
				frontmatter: {},
			})),
		},
	};
}

describe("AddRelationshipCommand", () => {
	let mockApp: any;
	let mockSettings: NexusPropertiesSettings;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = createMockApp();

		mockSettings = {
			parentProp: "Parent",
			childrenProp: "Child",
			relatedProp: "Related",
		} as NexusPropertiesSettings;
	});

	it("should execute and add link to source file", async () => {
		const command = new AddRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		await command.execute();

		expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith("source.md");
		expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalled();
	});

	it("should undo by removing link from source file", async () => {
		const command = new AddRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		await command.execute();
		await command.undo();

		expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(2);
	});

	it("should throw error if source file not found", async () => {
		mockApp = createMockApp(false);

		const command = new AddRelationshipCommand(mockApp, "nonexistent.md", "target.md", "parent", mockSettings);

		await expect(command.execute()).rejects.toThrow("Source file not found");
	});

	it("should return correct type for parent relationship", () => {
		const command = new AddRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		expect(command.getType()).toBe("Add parent relationship");
	});

	it("should return correct type for children relationship", () => {
		const command = new AddRelationshipCommand(mockApp, "source.md", "target.md", "children", mockSettings);

		expect(command.getType()).toBe("Add children relationship");
	});

	it("should return correct type for related relationship", () => {
		const command = new AddRelationshipCommand(mockApp, "source.md", "target.md", "related", mockSettings);

		expect(command.getType()).toBe("Add related relationship");
	});

	it("should check canUndo based on link presence", async () => {
		const { hasLinkInProperty } = await import("@real1ty-obsidian-plugins");
		(hasLinkInProperty as ReturnType<typeof vi.fn>).mockReturnValue(true);

		const command = new AddRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		await command.execute();
		const canUndo = await command.canUndo();

		expect(canUndo).toBe(true);
	});

	it("should return false for canUndo if file not found", async () => {
		const command = new AddRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		await command.execute();
		mockApp.vault.getAbstractFileByPath = vi.fn(() => null);

		const canUndo = await command.canUndo();
		expect(canUndo).toBe(false);
	});
});

describe("RemoveRelationshipCommand", () => {
	let mockApp: any;
	let mockSettings: NexusPropertiesSettings;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = createMockApp();

		mockSettings = {
			parentProp: "Parent",
			childrenProp: "Child",
			relatedProp: "Related",
		} as NexusPropertiesSettings;
	});

	it("should execute and remove link from source file", async () => {
		const command = new RemoveRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		await command.execute();

		expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith("source.md");
		expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalled();
	});

	it("should undo by adding link back to source file", async () => {
		const command = new RemoveRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		await command.execute();
		await command.undo();

		expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(2);
	});

	it("should throw error if source file not found", async () => {
		mockApp = createMockApp(false);

		const command = new RemoveRelationshipCommand(mockApp, "nonexistent.md", "target.md", "parent", mockSettings);

		await expect(command.execute()).rejects.toThrow("Source file not found");
	});

	it("should return correct type", () => {
		const command = new RemoveRelationshipCommand(mockApp, "source.md", "target.md", "related", mockSettings);

		expect(command.getType()).toBe("Remove related relationship");
	});

	it("should check canUndo based on link absence", async () => {
		const { hasLinkInProperty } = await import("@real1ty-obsidian-plugins");
		(hasLinkInProperty as ReturnType<typeof vi.fn>).mockReturnValue(false);

		const command = new RemoveRelationshipCommand(mockApp, "source.md", "target.md", "parent", mockSettings);

		await command.execute();
		const canUndo = await command.canUndo();

		expect(canUndo).toBe(true);
	});
});
