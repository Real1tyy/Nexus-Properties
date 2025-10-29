import { Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";

import type { SettingsSection } from "../types";

export class ExamplesSection implements SettingsSection {
	readonly id = "examples";
	readonly label = "Examples";

	constructor(private readonly plugin: NexusPropertiesPlugin) {}

	render(container: HTMLElement): void {
		const { currentSettings: settings } = this.plugin.settingsStore;

		new Setting(container).setName("How it works").setHeading();

		const exampleContainer = container.createDiv("settings-info-box");

		exampleContainer.createEl("h3", { text: "Bidirectional sync example" });
		exampleContainer.createEl("p", {
			text: "When you add a child relationship in one file, the parent relationship is automatically created in the other file:",
		});

		const beforeAfter = exampleContainer.createDiv("example-grid");
		const beforeSection = beforeAfter.createDiv("example-section");
		beforeSection.createEl("h4", { text: "You write this in parent-note.md:" });
		beforeSection.createEl("pre", {
			text: `---
${settings.childrenProp}:
  - "[[child-note-1]]"
  - "[[child-note-2]]"
---`,
			cls: "settings-info-box-example",
		});

		const afterSection = beforeAfter.createDiv("example-section");
		afterSection.createEl("h4", { text: "Plugin automatically updates child-note-1.md:" });
		afterSection.createEl("pre", {
			text: `---
${settings.parentProp}: "[[parent-note]]"
---`,
			cls: "settings-info-box-example",
		});

		exampleContainer.createEl("h3", { text: "Recursive tree computation" });
		exampleContainer.createEl("p", {
			text: "The plugin automatically computes all recursive relationships in the tree:",
		});

		const treeExample = exampleContainer.createDiv();
		treeExample.createEl("h4", { text: "If you have this hierarchy:" });
		treeExample.createEl("pre", {
			text: `grandparent.md
  ${settings.childrenProp}: ["[[parent.md]]"]

parent.md
  ${settings.parentProp}: "[[grandparent.md]]"
  ${settings.childrenProp}: ["[[child.md]]"]

child.md
  ${settings.parentProp}: "[[parent.md]]"`,
			cls: "settings-info-box-example",
		});

		treeExample.createEl("h4", { text: "Then child.md will automatically have:" });
		treeExample.createEl("pre", {
			text: `---
${settings.parentProp}: "[[parent.md]]"
---`,
			cls: "settings-info-box-example",
		});

		const noteBox = exampleContainer.createDiv("settings-info-note");
		noteBox.createEl("strong", { text: "ℹ️ Note: " });
		noteBox.appendText(
			"All recursive relationships (like all parents, all children, all related) are computed dynamically in the graph view and are not stored in frontmatter."
		);
	}
}
