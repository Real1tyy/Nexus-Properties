import { type App, Modal, Notice } from "obsidian";

export class NodeCreationModal extends Modal {
	private inputEl: HTMLInputElement | null = null;
	private onSubmit: (name: string) => void;
	private prefillText: string;
	private nodeType: string;

	constructor(
		app: App,
		nodeType: "parent" | "child" | "related",
		prefillText: string,
		onSubmit: (name: string) => void
	) {
		super(app);
		this.nodeType = nodeType;
		this.prefillText = prefillText;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("nexus-node-creation-modal");

		contentEl.createEl("h2", {
			text: `Create ${this.nodeType} node`,
			cls: "nexus-node-creation-title",
		});

		const inputContainer = contentEl.createDiv({ cls: "nexus-node-creation-input-container" });

		this.inputEl = inputContainer.createEl("input", {
			type: "text",
			placeholder: "Enter node name...",
			value: this.prefillText,
			cls: "nexus-node-creation-input",
		});

		// Focus and position cursor at the end (or beginning for parent)
		setTimeout(() => {
			if (!this.inputEl) return;
			this.inputEl.focus();
			if (this.nodeType === "parent") {
				// For parent, position cursor at the beginning (before " - ParentName")
				this.inputEl.setSelectionRange(0, 0);
			} else {
				// For child/related, position cursor at the end
				this.inputEl.setSelectionRange(this.prefillText.length, this.prefillText.length);
			}
		}, 50);

		// Handle Enter key
		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.submit();
			} else if (e.key === "Escape") {
				e.preventDefault();
				this.close();
			}
		});

		// Create button container
		const buttonContainer = contentEl.createDiv({ cls: "nexus-node-creation-buttons" });

		const createButton = buttonContainer.createEl("button", {
			text: "Create",
			cls: "mod-cta nexus-node-creation-button",
		});
		createButton.addEventListener("click", () => this.submit());

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
			cls: "nexus-node-creation-button",
		});
		cancelButton.addEventListener("click", () => this.close());
	}

	private submit(): void {
		if (!this.inputEl) return;

		const name = this.inputEl.value.trim();
		if (!name) {
			new Notice("Node name cannot be empty");
			return;
		}

		this.onSubmit(name);
		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.inputEl = null;
	}
}
