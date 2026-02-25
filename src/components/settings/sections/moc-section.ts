import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";

import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";

export class MocSection implements SettingsSection {
	readonly id = "moc";
	readonly label = "MOC";

	constructor(private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("MOC Configuration").setHeading();

		this.uiBuilder.addToggle(container, {
			key: "enableMocContentReading",
			name: "Enable MOC content reading",
			desc: "When enabled, reads note content to detect MOC (Map of Content) bullet list hierarchies. If valid MOC content is found (3+ links with nested structure), a button appears to switch between Properties and MOC modes. Disable for better performance if you don't use MOC bullet lists.",
		});

		this.uiBuilder.addDropdown(container, {
			key: "hierarchySource",
			name: "Default hierarchy source",
			desc: "The default mode when both Properties and MOC content are available. 'Properties' uses frontmatter relationships. 'MOC Content' uses bullet list hierarchies from note content.",
			options: {
				properties: "Properties (default)",
				"moc-content": "MOC Content",
			},
		});

		new Setting(container).setName("MOC View Display").setHeading();

		container
			.createDiv("setting-item-description nexus-properties-section-description")
			.setText("Configure which frontmatter properties to display next to each item in the MOC (Map of Content) view.");

		this.uiBuilder.addTextArray(container, {
			key: "mocDisplayProperties",
			name: "Display properties",
			desc: "Comma-separated list of frontmatter properties to show next to each note in the MOC tree. Properties with wiki links will be rendered as clickable links.",
			placeholder: "e.g., status, priority, tags",
		});
	}
}
