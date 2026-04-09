import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { NexusPropertiesSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

const S = NexusPropertiesSettingsSchema.shape;

export class MocSection implements SettingsSection {
	readonly id = "moc";
	readonly label = "MOC";

	constructor(private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("MOC Configuration").setHeading();

		this.uiBuilder.addSchemaField(
			container,
			{ enableMocContentReading: S.enableMocContentReading },
			{ label: "Enable MOC content reading" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ hierarchySource: S.hierarchySource },
			{
				label: "Default hierarchy source",
				options: {
					properties: "Properties (default)",
					"moc-content": "MOC Content",
				},
			}
		);

		new Setting(container).setName("MOC View Display").setHeading();

		container
			.createDiv("setting-item-description nexus-properties-section-description")
			.setText("Configure which frontmatter properties to display next to each item in the MOC (Map of Content) view.");

		this.uiBuilder.addSchemaField(
			container,
			{ mocDisplayProperties: S.mocDisplayProperties },
			{ label: "Display properties", placeholder: "e.g., status, priority, tags" }
		);
	}
}
