import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "src/types/constants";
import { NexusPropertiesSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

const S = NexusPropertiesSettingsSchema.shape;

export class PropertiesSection implements SettingsSection {
	readonly id = "properties";
	readonly label = "Properties";

	constructor(private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Property Display").setHeading();

		this.uiBuilder.addSchemaField(container, { hideEmptyProperties: S.hideEmptyProperties });

		this.uiBuilder.addSchemaField(container, { hideUnderscoreProperties: S.hideUnderscoreProperties });

		this.uiBuilder.addSchemaField(
			container,
			{ zoomHideFrontmatterByDefault: S.zoomHideFrontmatterByDefault },
			{ label: "Zoom: hide frontmatter by default" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ zoomHideContentByDefault: S.zoomHideContentByDefault },
			{ label: "Zoom: hide content by default" }
		);

		new Setting(container).setName("Direct Relationships").setHeading();

		container
			.createDiv("setting-item-description nexus-properties-section-description")
			.setText(
				"Configure property names for direct bidirectional relationships. When you set a relationship in one direction, the plugin automatically updates the reverse relationship."
			);

		this.uiBuilder.addSchemaField(container, { autoLinkSiblings: S.autoLinkSiblings }, { label: "Auto-link siblings" });

		this.uiBuilder.addSchemaField(
			container,
			{ parentProp: S.parentProp },
			{ label: "Parent property", placeholder: "parent" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ childrenProp: S.childrenProp },
			{ label: "Children property", placeholder: "children" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ relatedProp: S.relatedProp },
			{ label: "Related property", placeholder: "related" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ prioritizeParentProp: S.prioritizeParentProp },
			{ label: "Prioritize parent property", placeholder: "PriorityParent" }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ zettelIdProp: S.zettelIdProp },
			{ label: "Zettel ID property", placeholder: "_ZettelID" }
		);

		new Setting(container).setName("Automatic Title Property").setHeading();

		container
			.createDiv("setting-item-description nexus-properties-section-description")
			.setText(
				"Configure automatic title property assignment. When enabled, the plugin adds a Title property to files with the filename stripped of its parent prefix (e.g., 'Parent - Child.md' becomes 'Child'). This title is used in Graph and Bases views for cleaner display."
			);

		this.uiBuilder.addSchemaField(
			container,
			{ titlePropertyMode: S.titlePropertyMode },
			{
				label: "Title property mode",
				options: {
					enabled: "Enabled - Add title properties",
					disabled: "Disabled - Use file names",
					unknown: "Not configured",
				},
			}
		);

		this.uiBuilder.addSchemaField(
			container,
			{ titleProp: S.titleProp },
			{ label: "Title property name", placeholder: SETTINGS_DEFAULTS.DEFAULT_TITLE_PROP }
		);

		this.uiBuilder.addSchemaField(
			container,
			{ excludeTitleDirectories: S.excludeTitleDirectories },
			{ label: "Exclude directories from title", placeholder: "Templates, Daily Notes" }
		);
	}
}
