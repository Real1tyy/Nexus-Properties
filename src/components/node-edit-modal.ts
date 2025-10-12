import { type App, Modal, type TFile } from "obsidian";

interface PropertyRow {
	key: string;
	value: string;
	element: HTMLElement;
}

export class NodeEditModal extends Modal {
	private file: TFile;
	private onSave: (frontmatter: Record<string, unknown>) => void;
	private originalFrontmatter: Record<string, unknown> = {};
	private propertyRows: PropertyRow[] = [];
	private propertiesContainer!: HTMLElement;

	constructor(app: App, file: TFile, onSave: (frontmatter: Record<string, unknown>) => void) {
		super(app);
		this.file = file;
		this.onSave = onSave;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass("node-edit-modal");

		await this.loadFrontmatter();
		this.renderEditForm();
	}

	private async loadFrontmatter(): Promise<void> {
		try {
			const cache = this.app.metadataCache.getFileCache(this.file);
			if (cache?.frontmatter) {
				// Copy all frontmatter except Obsidian's internal properties
				// biome-ignore lint/correctness/noUnusedVariables: Using rest operator to exclude position
				const { position, ...userFrontmatter } = cache.frontmatter;
				this.originalFrontmatter = userFrontmatter;
			}
		} catch (error) {
			console.error("Error loading frontmatter:", error);
		}
	}

	private renderEditForm(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Header
		contentEl.createEl("h2", { text: `Edit: ${this.file.basename}` });

		// Properties section
		const section = contentEl.createDiv("node-edit-section");
		const headerContainer = section.createDiv("node-edit-header");

		headerContainer.createEl("h3", {
			text: "Frontmatter Properties",
			cls: "node-edit-section-title",
		});

		const addButton = headerContainer.createEl("button", {
			text: "+ Add Property",
			cls: "mod-cta",
		});
		addButton.addEventListener("click", () => {
			this.addPropertyRow("", "");
		});

		// Properties container
		this.propertiesContainer = section.createDiv("node-edit-props-container");

		// Load existing properties
		for (const [key, value] of Object.entries(this.originalFrontmatter)) {
			const stringValue = this.serializeValue(value);
			this.addPropertyRow(key, stringValue);
		}

		// Action buttons
		this.createActionButtons(contentEl);
	}

	private addPropertyRow(key: string, value: string): void {
		const row = this.propertiesContainer.createDiv("node-edit-prop-row");

		row.createEl("input", {
			type: "text",
			placeholder: "Property name",
			value: key,
			cls: "node-edit-prop-key-input",
		});

		row.createEl("input", {
			type: "text",
			placeholder: "Value",
			value: value,
			cls: "node-edit-prop-value-input",
		});

		const removeButton = row.createEl("button", {
			text: "×",
			cls: "node-edit-remove-button",
		});

		removeButton.addEventListener("click", () => {
			row.remove();
			const index = this.propertyRows.findIndex((p) => p.element === row);
			if (index !== -1) {
				this.propertyRows.splice(index, 1);
			}
		});

		this.propertyRows.push({ key, value, element: row });
	}

	private createActionButtons(contentEl: HTMLElement): void {
		const buttonContainer = contentEl.createDiv("modal-button-container");

		const saveButton = buttonContainer.createEl("button", {
			text: "Save",
			cls: "mod-cta",
		});
		saveButton.addEventListener("click", () => {
			this.save();
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	private save(): void {
		const updatedFrontmatter: Record<string, unknown> = {};

		// Collect all properties from the DOM
		const rows = this.propertiesContainer.querySelectorAll(".node-edit-prop-row");

		for (const row of Array.from(rows)) {
			const keyInput = row.querySelector(".node-edit-prop-key-input") as HTMLInputElement;
			const valueInput = row.querySelector(".node-edit-prop-value-input") as HTMLInputElement;

			if (keyInput?.value && valueInput?.value !== undefined) {
				const key = keyInput.value.trim();
				const rawValue = valueInput.value;

				// Parse the value to handle arrays, numbers, booleans, etc.
				updatedFrontmatter[key] = this.parseValue(rawValue);
			}
		}

		this.onSave(updatedFrontmatter);
		this.close();
	}

	private serializeValue(value: unknown): string {
		if (value === null || value === undefined) {
			return "";
		}

		if (Array.isArray(value)) {
			// For arrays, join with ", " for editing
			return value.map((item) => this.serializeValue(item)).join(", ");
		}

		if (typeof value === "object") {
			return JSON.stringify(value);
		}

		return String(value);
	}

	private parseValue(rawValue: string): unknown {
		const trimmed = rawValue.trim();

		if (trimmed === "") {
			return "";
		}

		// Try to parse as boolean
		if (trimmed.toLowerCase() === "true") {
			return true;
		}
		if (trimmed.toLowerCase() === "false") {
			return false;
		}

		// Try to parse as number
		if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
			const num = Number(trimmed);
			if (!Number.isNaN(num)) {
				return num;
			}
		}

		// Try to parse as array (comma-separated values)
		if (trimmed.includes(",")) {
			const items = trimmed.split(",").map((item) => item.trim());

			// Check if all items are non-empty
			if (items.every((item) => item.length > 0)) {
				return items;
			}
		}

		// Try to parse as JSON object/array
		if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
			try {
				return JSON.parse(trimmed);
			} catch {
				// If parsing fails, return as string
			}
		}

		// Default: return as string
		return trimmed;
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
