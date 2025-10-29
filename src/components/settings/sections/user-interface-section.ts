import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";

import type { SettingsSection } from "../types";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

export class UserInterfaceSettingsSection implements SettingsSection {
	readonly id = "user-interface";
	readonly label = "User Interface";

	constructor(
		private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>
	) {}

	render(container: HTMLElement): void {
		new Setting(container).setName("User Interface").setHeading();

		this.uiBuilder.addToggle(container, {
			key: "showRibbonIcon",
			name: "Show ribbon icon",
			desc: "Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting.",
		});

		this.uiBuilder.addToggle(container, {
			key: "showViewSwitcherHeader",
			name: "Show view switcher header",
			desc: "Display the header with toggle button in the Nexus Properties view. Changes apply immediately.",
		});
	}
}
