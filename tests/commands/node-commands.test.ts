import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NexusPropertiesSettings } from "../../src/types/settings";

// Must mock obsidian before importing anything that uses it
// The mock factory cannot reference external variables (hoisted issue)
vi.mock("obsidian", () => {
	class MockTFile {
		path: string;
		parent?: { path: string };
		basename: string;
		extension = "md";

		constructor(path: string) {
			this.path = path;
			this.basename = path.replace(/\.md$/, "").split("/").pop() || "";
			this.parent = { path: path.split("/").slice(0, -1).join("/") || "" };
		}
	}
	return {
		TFile: MockTFile,
	};
});

// Mock @real1ty-obsidian-plugins
vi.mock("@real1ty-obsidian-plugins", () => ({
	formatWikiLink: vi.fn((path) => `[[${path}]]`),
	generateUniqueFilePath: vi.fn((_app, folder, name) => (folder ? `${folder}/${name}.md` : `${name}.md`)),
	generateZettelId: vi.fn(() => "20240101120000"),
	normalizeProperty: vi.fn((value) => (Array.isArray(value) ? [...value] : value ? [value] : [])),
	removeLinkFromProperty: vi.fn((current, _path) => {
		if (!current) return [];
		return Array.isArray(current) ? current.slice(0, -1) : [];
	}),
}));

// Import after mocking
import { CreateNodeCommand } from "../../src/core/commands/create-node-command";
import { DeleteNodeCommand } from "../../src/core/commands/delete-node-command";
import { EditNodeCommand } from "../../src/core/commands/edit-node-command";
import { TFile } from "obsidian";

function createMockFile(path: string): any {
	const file = Object.create(TFile.prototype);
	file.path = path;
	file.basename = path.replace(/\.md$/, "").split("/").pop() || "";
	file.parent = { path: path.split("/").slice(0, -1).join("/") || "" };
	file.extension = "md";
	return file;
}

describe("CreateNodeCommand", () => {
	let mockApp: any;
	let mockSettings: NexusPropertiesSettings;
	let createdFiles: Map<string, any>;

	beforeEach(() => {
		vi.clearAllMocks();
		createdFiles = new Map();

		mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn((path: string) => {
					if (createdFiles.has(path)) {
						return createdFiles.get(path);
					}
					if (path === "source.md") {
						return createMockFile("source.md");
					}
					return null;
				}),
				create: vi.fn(async (path: string, _content: string) => {
					const file = createMockFile(path);
					createdFiles.set(path, file);
					return file;
				}),
				trash: vi.fn(async (file: any) => {
					createdFiles.delete(file.path);
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
					frontmatter: { Title: "Source Title" },
				})),
			},
		};

		mockSettings = {
			parentProp: "Parent",
			childrenProp: "Child",
			relatedProp: "Related",
			zettelIdProp: "_ZettelID",
			defaultExcludedProperties: ["Parent", "Child", "Related", "_ZettelID"],
			pathExcludedProperties: [],
		} as unknown as NexusPropertiesSettings;
	});

	it("should create a new file and setup relationships", async () => {
		const command = new CreateNodeCommand(mockApp, "source.md", "child", "New Child", mockSettings);

		await command.execute();

		expect(mockApp.vault.create).toHaveBeenCalled();
		expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalled();
		expect(command.getCreatedFilePath()).toBeTruthy();
	});

	it("should undo by trashing the created file", async () => {
		const command = new CreateNodeCommand(mockApp, "source.md", "child", "New Child", mockSettings);

		await command.execute();
		const createdPath = command.getCreatedFilePath();
		expect(createdPath).toBeTruthy();

		await command.undo();

		expect(mockApp.vault.trash).toHaveBeenCalled();
		expect(command.getCreatedFilePath()).toBeNull();
	});

	it("should throw error if source file not found", async () => {
		mockApp.vault.getAbstractFileByPath = vi.fn(() => null);

		const command = new CreateNodeCommand(mockApp, "nonexistent.md", "child", "New Child", mockSettings);

		await expect(command.execute()).rejects.toThrow("Source file not found");
	});

	it("should return correct type for child", () => {
		const command = new CreateNodeCommand(mockApp, "source.md", "child", "New Child", mockSettings);
		expect(command.getType()).toBe("Create child node");
	});

	it("should return correct type for parent", () => {
		const command = new CreateNodeCommand(mockApp, "source.md", "parent", "New Parent", mockSettings);
		expect(command.getType()).toBe("Create parent node");
	});

	it("should return correct type for related", () => {
		const command = new CreateNodeCommand(mockApp, "source.md", "related", "New Related", mockSettings);
		expect(command.getType()).toBe("Create related node");
	});

	it("should return true for canUndo when file exists", async () => {
		const command = new CreateNodeCommand(mockApp, "source.md", "child", "New Child", mockSettings);

		await command.execute();
		const canUndo = await command.canUndo();

		expect(canUndo).toBe(true);
	});

	it("should return false for canUndo when no file created", async () => {
		const command = new CreateNodeCommand(mockApp, "source.md", "child", "New Child", mockSettings);

		const canUndo = await command.canUndo();

		expect(canUndo).toBe(false);
	});
});

describe("DeleteNodeCommand", () => {
	let mockApp: any;
	let fileExists: boolean;

	beforeEach(() => {
		vi.clearAllMocks();
		fileExists = true;

		mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn((path: string) => (fileExists ? createMockFile(path) : null)),
				read: vi.fn(async () => "---\nTitle: Test\n---\n\nContent here"),
				trash: vi.fn(async () => {
					fileExists = false;
				}),
				create: vi.fn(async (path: string) => {
					fileExists = true;
					return createMockFile(path);
				}),
			},
			metadataCache: {
				getFileCache: vi.fn(() => ({
					frontmatter: { Title: "Test" },
				})),
			},
		};
	});

	it("should store original content and trash the file", async () => {
		const command = new DeleteNodeCommand(mockApp, "test.md");

		await command.execute();

		expect(mockApp.vault.read).toHaveBeenCalled();
		expect(mockApp.vault.trash).toHaveBeenCalled();
	});

	it("should undo by recreating the file", async () => {
		const command = new DeleteNodeCommand(mockApp, "test.md");

		await command.execute();
		await command.undo();

		expect(mockApp.vault.create).toHaveBeenCalledWith("test.md", expect.any(String));
	});

	it("should throw error if file not found on execute", async () => {
		fileExists = false;

		const command = new DeleteNodeCommand(mockApp, "nonexistent.md");

		await expect(command.execute()).rejects.toThrow("File not found");
	});

	it("should throw error if file already exists on undo", async () => {
		const command = new DeleteNodeCommand(mockApp, "test.md");

		await command.execute();
		fileExists = true; // Simulate file being recreated externally

		await expect(command.undo()).rejects.toThrow("File already exists");
	});

	it("should return correct type", () => {
		const command = new DeleteNodeCommand(mockApp, "test.md");
		expect(command.getType()).toBe("Delete node");
	});

	it("should check canUndo correctly", async () => {
		const command = new DeleteNodeCommand(mockApp, "test.md");

		// Before execute, no original content
		let canUndo = await command.canUndo();
		expect(canUndo).toBe(false);

		await command.execute();

		// After execute, file is deleted
		canUndo = await command.canUndo();
		expect(canUndo).toBe(true);
	});
});

describe("EditNodeCommand", () => {
	let mockApp: any;
	let fileExists: boolean;

	beforeEach(() => {
		vi.clearAllMocks();
		fileExists = true;

		mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn((path: string) => (fileExists ? createMockFile(path) : null)),
			},
			fileManager: {
				processFrontMatter: vi.fn(async (_file, callback) => {
					const fm: Record<string, any> = {};
					callback(fm);
				}),
			},
		};
	});

	it("should apply updated frontmatter on execute", async () => {
		const original = { Title: "Original", Status: "Draft" };
		const updated = { Title: "Updated", Status: "Published", NewProp: "Value" };

		const command = new EditNodeCommand(mockApp, "test.md", original, updated);

		await command.execute();

		expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalled();
	});

	it("should restore original frontmatter on undo", async () => {
		const original = { Title: "Original", Status: "Draft" };
		const updated = { Title: "Updated", Status: "Published" };

		const command = new EditNodeCommand(mockApp, "test.md", original, updated);

		await command.execute();
		await command.undo();

		expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(2);
	});

	it("should throw error if file not found", async () => {
		fileExists = false;

		const command = new EditNodeCommand(mockApp, "nonexistent.md", {}, { Title: "New" });

		await expect(command.execute()).rejects.toThrow("File not found");
	});

	it("should return correct type", () => {
		const command = new EditNodeCommand(mockApp, "test.md", {}, {});
		expect(command.getType()).toBe("Edit node");
	});

	it("should check canUndo based on file existence", async () => {
		const command = new EditNodeCommand(mockApp, "test.md", {}, {});

		let canUndo = await command.canUndo();
		expect(canUndo).toBe(true);

		fileExists = false;
		canUndo = await command.canUndo();
		expect(canUndo).toBe(false);
	});

	it("should not mutate original or updated frontmatter objects", async () => {
		const original = { Title: "Original" };
		const updated = { Title: "Updated" };
		const originalCopy = { ...original };
		const updatedCopy = { ...updated };

		const command = new EditNodeCommand(mockApp, "test.md", original, updated);
		await command.execute();
		await command.undo();

		expect(original).toEqual(originalCopy);
		expect(updated).toEqual(updatedCopy);
	});
});
