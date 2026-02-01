import { parseValue, serializeValue } from "@real1ty-obsidian-plugins";
import { type App, Modal, type TFile } from "obsidian";
import { cls } from "../utils/css";

interface PropertyRow {
	originalKey: string;
	originalSerializedValue: string;
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
		contentEl.addClass(cls("node-edit-modal"));

		await this.loadFrontmatter();
		this.renderEditForm();

		// Handle Enter key to submit
		this.scope.register([], "Enter", (e) => {
			e.preventDefault();
			this.save();
		});
	}

	private async loadFrontmatter(): Promise<void> {
		try {
			const cache = this.app.metadataCache.getFileCache(this.file);
			if (cache?.frontmatter) {
				// Copy all frontmatter except Obsidian's internal properties
				const { position: _position, ...userFrontmatter } = cache.frontmatter;
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
		const section = contentEl.createDiv(cls("node-edit-section"));
		const headerContainer = section.createDiv(cls("node-edit-header"));

		headerContainer.createEl("h3", {
			text: "Frontmatter Properties",
			cls: cls("node-edit-section-title"),
		});

		const addButton = headerContainer.createEl("button", {
			text: "+ Add Property",
			cls: "mod-cta",
		});
		addButton.addEventListener("click", () => {
			this.addPropertyRow("", "");
		});

		// Properties container
		this.propertiesContainer = section.createDiv(cls("node-edit-props-container"));

		// Load existing properties
		for (const [key, value] of Object.entries(this.originalFrontmatter)) {
			const stringValue = serializeValue(value);
			this.addPropertyRow(key, stringValue);
		}

		// Action buttons
		this.createActionButtons(contentEl);
	}

	private addPropertyRow(key: string, serializedValue: string): void {
		const row = this.propertiesContainer.createDiv(cls("node-edit-prop-row"));

		row.createEl("input", {
			type: "text",
			placeholder: "Property name",
			value: key,
			cls: cls("node-edit-prop-key-input"),
		});

		row.createEl("input", {
			type: "text",
			placeholder: "Value",
			value: serializedValue,
			cls: cls("node-edit-prop-value-input"),
		});

		const removeButton = row.createEl("button", {
			text: "×",
			cls: cls("node-edit-remove-button"),
		});

		removeButton.addEventListener("click", () => {
			row.remove();
			const index = this.propertyRows.findIndex((p) => p.element === row);
			if (index !== -1) {
				this.propertyRows.splice(index, 1);
			}
		});

		this.propertyRows.push({ originalKey: key, originalSerializedValue: serializedValue, element: row });
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
		const rows = this.propertiesContainer.querySelectorAll(`.${cls("node-edit-prop-row")}`);

		for (const row of Array.from(rows)) {
			const keyInput = row.querySelector(`.${cls("node-edit-prop-key-input")}`) as HTMLInputElement;
			const valueInput = row.querySelector(`.${cls("node-edit-prop-value-input")}`) as HTMLInputElement;

			if (keyInput?.value && valueInput?.value !== undefined) {
				const currentKey = keyInput.value.trim();
				const currentValue = valueInput.value;

				// Find the corresponding property row to check if value was changed
				const propertyRow = this.propertyRows.find((p) => p.element === row);

				// Determine if this is an unchanged existing property
				const isUnchangedExisting =
					propertyRow &&
					propertyRow.originalKey === currentKey &&
					propertyRow.originalSerializedValue === currentValue &&
					currentKey in this.originalFrontmatter;

				if (isUnchangedExisting) {
					// Use the original value to preserve type (e.g., [] stays [], not "")
					updatedFrontmatter[currentKey] = this.originalFrontmatter[currentKey];
				} else {
					// Value was changed or this is a new property, parse it
					updatedFrontmatter[currentKey] = parseValue(currentValue);
				}
			}
		}

		this.onSave(updatedFrontmatter);
		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
