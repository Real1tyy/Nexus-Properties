import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { type App, PluginSettingTab, Setting } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "./types";
import { ColorSettingsSection } from "./sections/color-settings-section";
import { DirectRelationshipsSection } from "./sections/direct-relationships-section";
import { DirectorySettingsSection } from "./sections/directory-settings-section";
import { ExamplesSection } from "./sections/examples-section";
import { FilteringSettingsSection } from "./sections/filtering-settings-section";
import { GraphDisplaySettingsSection } from "./sections/graph-display-section";
import { IndexingSection } from "./sections/indexing-section";
import { NodeCreationSettingsSection } from "./sections/node-creation-section";
import { PropertyDisplaySettingsSection } from "./sections/property-display-section";
import { UserInterfaceSettingsSection } from "./sections/user-interface-section";

const SPONSOR_URL = "https://github.com/sponsors/Real1tyy";

export class NexusPropertiesSettingsTab extends PluginSettingTab {
	plugin: NexusPropertiesPlugin;

	private readonly uiBuilder: SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>;
	private readonly sections: SettingsSection[];
	private selectedSectionId: string;
	private sectionContainer: HTMLElement | null = null;

	constructor(app: App, plugin: NexusPropertiesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.uiBuilder = new SettingsUIBuilder(this.plugin.settingsStore);
		this.sections = this.createSections();
		this.selectedSectionId = this.sections[0]?.id ?? "user-interface";
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h1", { text: "Nexus Properties Settings" });

		if (this.sections.length > 0) {
			const sectionSelect = new Setting(containerEl)
				.setName("Section")
				.setDesc("Choose which settings section to configure");

			sectionSelect.addDropdown((dropdown) => {
				for (const section of this.sections) {
					dropdown.addOption(section.id, section.label);
				}

				dropdown.setValue(this.selectedSectionId);
				dropdown.onChange((value) => {
					this.selectedSectionId = value;
					this.renderSelectedSection();
				});
			});
		}

		this.sectionContainer = containerEl.createDiv({ cls: "nexus-settings-section-container" });
		this.renderSelectedSection();

		const footer = containerEl.createDiv({ cls: "setting-item settings-footer" });
		footer.createEl("a", {
			text: "Support Nexus Properties Development",
			href: SPONSOR_URL,
			cls: "settings-support-link",
			attr: { target: "_blank", rel: "noopener" },
		});
	}

	private renderSelectedSection(): void {
		if (!this.sectionContainer) {
			return;
		}

		this.sectionContainer.empty();
		const section = this.sections.find((candidate) => candidate.id === this.selectedSectionId) ?? this.sections[0];

		section?.render(this.sectionContainer);
	}

	private createSections(): SettingsSection[] {
		return [
			new UserInterfaceSettingsSection(this.uiBuilder),
			new GraphDisplaySettingsSection(this.uiBuilder),
			new PropertyDisplaySettingsSection(this.uiBuilder),
			new ColorSettingsSection(this.plugin),
			new FilteringSettingsSection(this.plugin, this.uiBuilder),
			new IndexingSection(this.plugin),
			new DirectorySettingsSection(this.uiBuilder),
			new DirectRelationshipsSection(this.uiBuilder),
			new NodeCreationSettingsSection(this.plugin, this.uiBuilder),
			new ExamplesSection(this.plugin),
		];
	}
}
