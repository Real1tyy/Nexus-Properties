import { type App, Modal } from "obsidian";

export interface TitlePropertySetupConfig {
	onEnable: () => void;
	onDisable: () => void;
}

export class TitlePropertySetupModal extends Modal {
	private config: TitlePropertySetupConfig;

	constructor(app: App, config: TitlePropertySetupConfig) {
		super(app);
		this.config = config;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("nexus-title-property-setup-modal");

		contentEl.createEl("h2", {
			text: "Configure Automatic Title Property",
			cls: "nexus-title-property-setup-title",
		});

		const descriptionEl = contentEl.createDiv({
			cls: "nexus-title-property-setup-description",
		});

		descriptionEl.createEl("p", {
			text: "Nexus Properties can automatically add a Title property to your files. This title is computed by stripping the parent name prefix from the filename (e.g., 'Parent - Child.md' becomes 'Child').",
		});

		descriptionEl.createEl("p", {
			text: "Before enabling, you may want to configure excluded directories in Settings → Properties → 'Exclude directories from title' to skip directories like Templates or Daily Notes.",
		});

		const warningEl = descriptionEl.createEl("p", {
			cls: "nexus-title-property-setup-warning",
		});
		warningEl.createEl("strong", { text: "Note: " });
		warningEl.appendText(
			"If you enable this feature, title properties will be added to all indexed files. You can configure exclusions in settings at any time."
		);

		// Create button container
		const buttonContainer = contentEl.createDiv({
			cls: "nexus-title-property-setup-buttons",
		});

		const enableButton = buttonContainer.createEl("button", {
			text: "Enable Title Property",
			cls: "mod-cta nexus-title-property-setup-button",
		});
		enableButton.addEventListener("click", () => {
			this.config.onEnable();
			this.close();
		});

		const disableButton = buttonContainer.createEl("button", {
			text: "Disable (Use file names)",
			cls: "nexus-title-property-setup-button",
		});
		disableButton.addEventListener("click", () => {
			this.config.onDisable();
			this.close();
		});

		const laterButton = buttonContainer.createEl("button", {
			text: "Decide Later",
			cls: "nexus-title-property-setup-button nexus-title-property-setup-button-later",
		});
		laterButton.addEventListener("click", () => {
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
