import type { TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { CreateNodeCommand, type CommandManager } from "../../src/core/commands";
import { NodeCreator } from "../../src/core/node-creator";
import type { NodeCreationType } from "../../src/types/constants";
import { createMockSettingsSubject, createSeededApp, tfileFor } from "../fixtures";

function makeManager(overrides: Partial<CommandManager> = {}): CommandManager {
	return {
		executeCommand: vi.fn().mockResolvedValue(undefined),
		undo: vi.fn().mockResolvedValue(true),
		redo: vi.fn().mockResolvedValue(true),
		clear: vi.fn(),
		canUndo: vi.fn().mockReturnValue(false),
		canRedo: vi.fn().mockReturnValue(false),
		...overrides,
	} as unknown as CommandManager;
}

describe("NodeCreator.generateAutoNodeName", () => {
	const { app } = createSeededApp();
	const creator = new NodeCreator(app, createMockSettingsSubject(), makeManager());

	it.each([
		["parent", "Project", " - Project"],
		["child", "Project", "Project - "],
		["related", "Project", "Project "],
	] as const)("type=%s on '%s' produces '%s'", (type, basename, expected) => {
		expect(creator.generateAutoNodeName(basename, type as NodeCreationType)).toBe(expected);
	});

	it("handles names with spaces, dashes, and unicode", () => {
		expect(creator.generateAutoNodeName("My Project - 2026", "parent")).toBe(" - My Project - 2026");
		expect(creator.generateAutoNodeName("プロジェクト", "child")).toBe("プロジェクト - ");
	});
});

describe("NodeCreator.createRelatedNode", () => {
	it("delegates to CreateNodeCommand and returns the created TFile when present", async () => {
		const { app } = createSeededApp([{ path: "Source.md", frontmatter: {} }]);
		const created: TFile = tfileFor("Source - Child.md");
		// Pre-seed the vault so the resolution after command execution finds the file.
		(app.vault.getAbstractFileByPath as any).mockImplementation((p: string) =>
			p === "Source - Child.md" ? created : null
		);

		const executeCommand = vi.fn(async (cmd: CreateNodeCommand) => {
			// Simulate what the real command would do: record the created file path.
			(cmd as any).createdFilePath = "Source - Child.md";
		});

		const creator = new NodeCreator(app, createMockSettingsSubject(), makeManager({ executeCommand } as any));
		const result = await creator.createRelatedNodeWithName(tfileFor("Source.md"), "child", "Source - Child");

		expect(executeCommand).toHaveBeenCalledTimes(1);
		expect(executeCommand.mock.calls[0][0]).toBeInstanceOf(CreateNodeCommand);
		expect(result).toBe(created);
	});

	it("returns null when the command exits without recording a file path", async () => {
		const { app } = createSeededApp([{ path: "Source.md", frontmatter: {} }]);
		const executeCommand = vi.fn().mockResolvedValue(undefined);
		const creator = new NodeCreator(app, createMockSettingsSubject(), makeManager({ executeCommand } as any));

		const result = await creator.createRelatedNodeWithName(tfileFor("Source.md"), "child", "Other");

		expect(result).toBeNull();
	});

	it("returns null and swallows command errors (logs to console)", async () => {
		const { app } = createSeededApp([{ path: "Source.md", frontmatter: {} }]);
		const executeCommand = vi.fn().mockRejectedValue(new Error("boom"));
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		const creator = new NodeCreator(app, createMockSettingsSubject(), makeManager({ executeCommand } as any));
		const result = await creator.createRelatedNodeWithName(tfileFor("Source.md"), "parent", "X");

		expect(result).toBeNull();
		expect(consoleError).toHaveBeenCalledTimes(1);
		consoleError.mockRestore();
	});

	it("createRelatedNode (auto-name) prepends/appends per type", async () => {
		const { app } = createSeededApp([{ path: "Source.md", frontmatter: {} }]);
		const executeCommand = vi.fn(async (cmd: CreateNodeCommand) => {
			// Capture the name the command was constructed with via index access.
			(cmd as any).createdFilePath = `Some/${(cmd as any).nodeName}.md`;
		});
		const creator = new NodeCreator(app, createMockSettingsSubject(), makeManager({ executeCommand } as any));

		await creator.createRelatedNode(tfileFor("Source.md"), "child");

		const cmd = executeCommand.mock.calls[0][0];
		expect((cmd as any).nodeName).toBe("Source - ");
	});
});
