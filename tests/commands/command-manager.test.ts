import { describe, expect, it, vi, beforeEach } from "vitest";
import { CommandManager } from "../../src/core/commands/command-manager";
import { MacroCommand, type Command } from "../../src/core/commands/command";

// Mock Notice from obsidian
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
}));

// Helper to create a mock command
function createMockCommand(type = "TestCommand"): Command & {
	executeCalls: number;
	undoCalls: number;
	canUndoValue: boolean;
} {
	const command = {
		executeCalls: 0,
		undoCalls: 0,
		canUndoValue: true,
		execute: vi.fn(async () => {
			command.executeCalls++;
		}),
		undo: vi.fn(async () => {
			command.undoCalls++;
		}),
		getType: () => type,
		canUndo: vi.fn(async () => command.canUndoValue),
	};
	return command;
}

describe("CommandManager", () => {
	let commandManager: CommandManager;

	beforeEach(() => {
		commandManager = new CommandManager();
	});

	describe("executeCommand", () => {
		it("should execute a command and add it to undo stack", async () => {
			const command = createMockCommand();
			await commandManager.executeCommand(command);

			expect(command.execute).toHaveBeenCalledOnce();
			expect(commandManager.canUndo()).toBe(true);
			expect(commandManager.getUndoStackSize()).toBe(1);
		});

		it("should clear redo stack when new command is executed", async () => {
			const command1 = createMockCommand("Command1");
			const command2 = createMockCommand("Command2");
			const command3 = createMockCommand("Command3");

			await commandManager.executeCommand(command1);
			await commandManager.executeCommand(command2);
			await commandManager.undo();

			expect(commandManager.canRedo()).toBe(true);
			expect(commandManager.getRedoStackSize()).toBe(1);

			await commandManager.executeCommand(command3);

			expect(commandManager.canRedo()).toBe(false);
			expect(commandManager.getRedoStackSize()).toBe(0);
		});

		it("should enforce history size limit", async () => {
			const smallManager = new CommandManager(3);

			for (let i = 0; i < 5; i++) {
				await smallManager.executeCommand(createMockCommand(`Command${i}`));
			}

			expect(smallManager.getUndoStackSize()).toBe(3);
		});
	});

	describe("undo", () => {
		it("should undo the most recent command", async () => {
			const command = createMockCommand();
			await commandManager.executeCommand(command);
			await commandManager.undo();

			expect(command.undo).toHaveBeenCalledOnce();
			expect(commandManager.canUndo()).toBe(false);
			expect(commandManager.canRedo()).toBe(true);
		});

		it("should return false when nothing to undo", async () => {
			const result = await commandManager.undo();

			expect(result).toBe(false);
		});

		it("should move command to redo stack after undo", async () => {
			const command = createMockCommand();
			await commandManager.executeCommand(command);
			await commandManager.undo();

			expect(commandManager.getUndoStackSize()).toBe(0);
			expect(commandManager.getRedoStackSize()).toBe(1);
		});

		it("should not add to redo stack if canUndo returns false", async () => {
			const command = createMockCommand();
			command.canUndoValue = false;

			await commandManager.executeCommand(command);
			const result = await commandManager.undo();

			expect(result).toBe(false);
			expect(commandManager.getRedoStackSize()).toBe(0);
		});
	});

	describe("redo", () => {
		it("should redo the most recently undone command", async () => {
			const command = createMockCommand();
			await commandManager.executeCommand(command);
			await commandManager.undo();
			await commandManager.redo();

			expect(command.execute).toHaveBeenCalledTimes(2);
			expect(commandManager.canUndo()).toBe(true);
			expect(commandManager.canRedo()).toBe(false);
		});

		it("should return false when nothing to redo", async () => {
			const result = await commandManager.redo();

			expect(result).toBe(false);
		});

		it("should move command back to undo stack after redo", async () => {
			const command = createMockCommand();
			await commandManager.executeCommand(command);
			await commandManager.undo();
			await commandManager.redo();

			expect(commandManager.getUndoStackSize()).toBe(1);
			expect(commandManager.getRedoStackSize()).toBe(0);
		});
	});

	describe("canUndo/canRedo", () => {
		it("should return false for empty stacks", () => {
			expect(commandManager.canUndo()).toBe(false);
			expect(commandManager.canRedo()).toBe(false);
		});

		it("should return correct states after operations", async () => {
			const command = createMockCommand();

			await commandManager.executeCommand(command);
			expect(commandManager.canUndo()).toBe(true);
			expect(commandManager.canRedo()).toBe(false);

			await commandManager.undo();
			expect(commandManager.canUndo()).toBe(false);
			expect(commandManager.canRedo()).toBe(true);

			await commandManager.redo();
			expect(commandManager.canUndo()).toBe(true);
			expect(commandManager.canRedo()).toBe(false);
		});
	});

	describe("clearHistory", () => {
		it("should clear both stacks", async () => {
			const command1 = createMockCommand();
			const command2 = createMockCommand();

			await commandManager.executeCommand(command1);
			await commandManager.executeCommand(command2);
			await commandManager.undo();

			commandManager.clearHistory();

			expect(commandManager.canUndo()).toBe(false);
			expect(commandManager.canRedo()).toBe(false);
			expect(commandManager.getUndoStackSize()).toBe(0);
			expect(commandManager.getRedoStackSize()).toBe(0);
		});
	});

	describe("peekUndo/peekRedo", () => {
		it("should return null for empty stacks", () => {
			expect(commandManager.peekUndo()).toBeNull();
			expect(commandManager.peekRedo()).toBeNull();
		});

		it("should return correct command types", async () => {
			const command1 = createMockCommand("FirstCommand");
			const command2 = createMockCommand("SecondCommand");

			await commandManager.executeCommand(command1);
			await commandManager.executeCommand(command2);

			expect(commandManager.peekUndo()).toBe("SecondCommand");

			await commandManager.undo();

			expect(commandManager.peekUndo()).toBe("FirstCommand");
			expect(commandManager.peekRedo()).toBe("SecondCommand");
		});
	});
});

describe("MacroCommand", () => {
	it("should execute all commands in order", async () => {
		const command1 = createMockCommand("Command1");
		const command2 = createMockCommand("Command2");
		const command3 = createMockCommand("Command3");

		const macro = new MacroCommand([command1, command2, command3]);
		await macro.execute();

		expect(command1.execute).toHaveBeenCalledOnce();
		expect(command2.execute).toHaveBeenCalledOnce();
		expect(command3.execute).toHaveBeenCalledOnce();
	});

	it("should undo all commands in reverse order", async () => {
		const executionOrder: string[] = [];
		const command1 = {
			execute: vi.fn(async () => {}),
			undo: vi.fn(async () => {
				executionOrder.push("undo1");
			}),
			getType: () => "Command1",
		};
		const command2 = {
			execute: vi.fn(async () => {}),
			undo: vi.fn(async () => {
				executionOrder.push("undo2");
			}),
			getType: () => "Command2",
		};
		const command3 = {
			execute: vi.fn(async () => {}),
			undo: vi.fn(async () => {
				executionOrder.push("undo3");
			}),
			getType: () => "Command3",
		};

		const macro = new MacroCommand([command1, command2, command3]);
		await macro.execute();
		await macro.undo();

		expect(executionOrder).toEqual(["undo3", "undo2", "undo1"]);
	});

	it("should rollback on execute failure", async () => {
		const command1 = createMockCommand("Command1");
		const command2 = {
			execute: vi.fn(async () => {
				throw new Error("Execute failed");
			}),
			undo: vi.fn(async () => {}),
			getType: () => "Command2",
		};
		const command3 = createMockCommand("Command3");

		const macro = new MacroCommand([command1, command2, command3]);

		await expect(macro.execute()).rejects.toThrow("Execute failed");
		expect(command1.undo).toHaveBeenCalledOnce();
		expect(command3.execute).not.toHaveBeenCalled();
	});

	it("should add commands with addCommand", async () => {
		const macro = new MacroCommand();
		const command = createMockCommand();

		macro.addCommand(command);
		await macro.execute();

		expect(command.execute).toHaveBeenCalledOnce();
		expect(macro.getCommandCount()).toBe(1);
	});

	it("should return correct type", () => {
		const macro = new MacroCommand();
		expect(macro.getType()).toBe("MacroCommand");
	});

	it("should check canUndo for all executed commands", async () => {
		const command1 = createMockCommand();
		const command2 = createMockCommand();
		command2.canUndoValue = false;

		const macro = new MacroCommand([command1, command2]);
		await macro.execute();

		const canUndo = await macro.canUndo();
		expect(canUndo).toBe(false);
	});

	it("should return false for canUndo when no commands executed", async () => {
		const macro = new MacroCommand();
		const canUndo = await macro.canUndo();
		expect(canUndo).toBe(false);
	});
});
