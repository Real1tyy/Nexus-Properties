/**
 * Type declarations for Obsidian API helpers not yet in official type definitions
 * These are available in Obsidian v1.6.0+
 */

import "obsidian";

declare module "obsidian" {
	/**
	 * Display a native confirmation dialog with Obsidian styling.
	 * Available in Obsidian v1.6.0+
	 *
	 * @param title - The dialog title
	 * @param message - The confirmation message
	 * @returns Promise that resolves to true if confirmed, false if cancelled
	 *
	 * @example
	 * ```typescript
	 * import { confirm } from "obsidian";
	 * const confirmed = await confirm("Delete note?", "This action cannot be undone.");
	 * if (confirmed) {
	 *   // proceed with deletion
	 * }
	 * ```
	 */
	export function confirm(title: string, message?: string): Promise<boolean>;
}
