import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";
import { SETTINGS_DEFAULTS } from "src/types/constants";

export class PropertiesSection implements SettingsSection {
	readonly id = "properties";
	readonly label = "Properties";

	constructor(private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("Property Display").setHeading();

		this.uiBuilder.addToggle(container, {
			key: "hideEmptyProperties",
			name: "Hide empty properties",
			desc: "Hide properties with empty, null, or undefined values in tooltips and previews",
		});

		this.uiBuilder.addToggle(container, {
			key: "hideUnderscoreProperties",
			name: "Hide underscore properties",
			desc: "Hide properties that start with an underscore (_) in tooltips and previews",
		});

		this.uiBuilder.addToggle(container, {
			key: "zoomHideFrontmatterByDefault",
			name: "Zoom: hide frontmatter by default",
			desc: "When entering zoom preview, frontmatter starts hidden by default",
		});

		this.uiBuilder.addToggle(container, {
			key: "zoomHideContentByDefault",
			name: "Zoom: hide content by default",
			desc: "When entering zoom preview, file content starts hidden by default",
		});

		new Setting(container).setName("Direct Relationships").setHeading();

		container
			.createDiv("setting-item-description nexus-properties-section-description")
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

		this.uiBuilder.addText(container, {
			key: "prioritizeParentProp",
			name: "Prioritize parent property",
			desc: "Optional property name to specify which parent should be prioritized when building hierarchy graphs. If a node has multiple parents and this property is set with a parent's name, that parent will be chosen.",
			placeholder: "PriorityParent",
		});

		this.uiBuilder.addText(container, {
			key: "zettelIdProp",
			name: "Zettel ID property",
			desc: "Property name for unique timestamp identifier assigned to new nodes",
			placeholder: "_ZettelID",
		});

		this.uiBuilder.addText(container, {
			key: "titleProp",
			name: "Title property",
			desc: "Property name for auto-assigned title (file name with parent prefix stripped)",
			placeholder: SETTINGS_DEFAULTS.DEFAULT_TITLE_PROP,
		});
	}
}
