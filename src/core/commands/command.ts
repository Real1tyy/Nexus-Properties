/**
 * Command interface for implementing the Command pattern.
 * Each command encapsulates an operation that can be executed and undone.
 */
export interface Command {
	/**
	 * Execute the command.
	 */
	execute(): Promise<void>;

	/**
	 * Undo the command, reverting any changes made by execute().
	 */
	undo(): Promise<void>;

	/**
	 * Get the type identifier for this command.
	 */
	getType(): string;

	/**
	 * Check if this command can be undone.
	 * Returns false if the state has changed such that undo is no longer possible.
	 */
	canUndo?(): boolean | Promise<boolean>;
}

/**
 * MacroCommand combines multiple commands into a single undoable operation.
 * All sub-commands are executed in order, and undone in reverse order.
 */
export class MacroCommand implements Command {
	private executedCommands: Command[] = [];

	constructor(private commands: Command[] = []) {
		this.commands = [...commands];
	}

	/**
	 * Add a command to the macro.
	 */
	addCommand(command: Command): void {
		this.commands.push(command);
	}

	/**
	 * Execute all commands in order.
	 * If any command fails, previously executed commands are undone.
	 */
	async execute(): Promise<void> {
		this.executedCommands = [];

		for (const command of this.commands) {
			try {
				await command.execute();
				this.executedCommands.push(command);
			} catch (error) {
				// Rollback previously executed commands
				await this.undoExecuted();
				throw error;
			}
		}
	}

	/**
	 * Undo all executed commands in reverse order.
	 */
	async undo(): Promise<void> {
		await this.undoExecuted();
	}

	private async undoExecuted(): Promise<void> {
		// Undo in reverse order
		for (let i = this.executedCommands.length - 1; i >= 0; i--) {
			const command = this.executedCommands[i];
			try {
				await command.undo();
			} catch (error) {
				console.error(`Failed to undo command ${command.getType()}:`, error);
				// Continue undoing other commands even if one fails
			}
		}
		this.executedCommands = [];
	}

	getType(): string {
		return "MacroCommand";
	}

	async canUndo(): Promise<boolean> {
		if (this.executedCommands.length === 0) {
			return false;
		}

		for (const command of this.executedCommands) {
			if (command.canUndo) {
				const canUndo = await command.canUndo();
				if (!canUndo) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Get the number of commands in this macro.
	 */
	getCommandCount(): number {
		return this.commands.length;
	}
}
