import { Notice } from "obsidian";
import type { Command } from "./command";

/**
 * CommandManager manages the undo/redo stacks for commands.
 * It provides the ability to execute commands and navigate through command history.
 */
export class CommandManager {
	private undoStack: Command[] = [];
	private redoStack: Command[] = [];

	constructor(private maxHistorySize = 50) {}

	/**
	 * Execute a command and add it to the undo stack.
	 * Clears the redo stack since we're creating a new branch of history.
	 */
	async executeCommand(command: Command): Promise<void> {
		await command.execute();

		this.undoStack.push(command);
		this.redoStack = []; // Clear redo stack on new command

		// Enforce history size limit
		while (this.undoStack.length > this.maxHistorySize) {
			this.undoStack.shift();
		}
	}

	/**
	 * Undo the most recent command.
	 * Returns true if undo was successful, false if there was nothing to undo.
	 */
	async undo(): Promise<boolean> {
		const command = this.undoStack.pop();
		if (!command) {
			new Notice("Nothing to undo");
			return false;
		}

		// Check if command can be undone
		if (command.canUndo) {
			const canUndo = await command.canUndo();
			if (!canUndo) {
				new Notice("Cannot undo: state has changed");
				// Don't push to redo since we couldn't undo
				return false;
			}
		}

		try {
			await command.undo();
			this.redoStack.push(command);
			new Notice(`Undid: ${command.getType()}`);
			return true;
		} catch (error) {
			console.error(`Failed to undo ${command.getType()}:`, error);
			new Notice(`Failed to undo: ${command.getType()}`);
			return false;
		}
	}

	/**
	 * Redo the most recently undone command.
	 * Returns true if redo was successful, false if there was nothing to redo.
	 */
	async redo(): Promise<boolean> {
		const command = this.redoStack.pop();
		if (!command) {
			new Notice("Nothing to redo");
			return false;
		}

		try {
			await command.execute();
			this.undoStack.push(command);
			new Notice(`Redid: ${command.getType()}`);
			return true;
		} catch (error) {
			console.error(`Failed to redo ${command.getType()}:`, error);
			new Notice(`Failed to redo: ${command.getType()}`);
			return false;
		}
	}

	/**
	 * Check if there are commands that can be undone.
	 */
	canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	/**
	 * Check if there are commands that can be redone.
	 */
	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	/**
	 * Clear all command history.
	 */
	clearHistory(): void {
		this.undoStack = [];
		this.redoStack = [];
	}

	/**
	 * Get the number of commands in the undo stack.
	 */
	getUndoStackSize(): number {
		return this.undoStack.length;
	}

	/**
	 * Get the number of commands in the redo stack.
	 */
	getRedoStackSize(): number {
		return this.redoStack.length;
	}

	/**
	 * Get the type of the next command to be undone, or null if none.
	 */
	peekUndo(): string | null {
		if (this.undoStack.length === 0) {
			return null;
		}
		return this.undoStack[this.undoStack.length - 1].getType();
	}

	/**
	 * Get the type of the next command to be redone, or null if none.
	 */
	peekRedo(): string | null {
		if (this.redoStack.length === 0) {
			return null;
		}
		return this.redoStack[this.redoStack.length - 1].getType();
	}
}
