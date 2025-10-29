import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";

export class DirectRelationshipsSection implements SettingsSection {
	readonly id = "direct-relationships";
	readonly label = "Direct Relationships";

	constructor(private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Direct relationship properties").setHeading();

		container
			.createDiv("setting-item-description")
			.setText(
				"Configure property names for direct bidirectional relationships. When you set a relationship in one direction, the plugin automatically updates the reverse relationship."
			);

		this.uiBuilder.addToggle(container, {
			key: "autoLinkSiblings",
			name: "Auto-link siblings",
			desc: "Automatically mark nodes as related when they share the same parent (siblings are related to each other)",
		});

		this.uiBuilder.addText(container, {
			key: "parentProp",
			name: "Parent property",
			desc: "Property name for parent reference (bidirectional with children)",
			placeholder: "parent",
		});

		this.uiBuilder.addText(container, {
			key: "childrenProp",
			name: "Children property",
			desc: "Property name for children references (bidirectional with parent)",
			placeholder: "children",
		});

		this.uiBuilder.addText(container, {
			key: "relatedProp",
			name: "Related property",
			desc: "Property name for related files (bidirectional - automatically syncs between linked files)",
			placeholder: "related",
		});
	}
}
