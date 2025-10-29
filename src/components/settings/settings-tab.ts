import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { type App, PluginSettingTab } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import { DirectRelationshipsSection } from "./sections/direct-relationships-section";
import { DirectoriesSection } from "./sections/directories-section";
import { ExamplesSection } from "./sections/examples-section";
import { GraphDisplaySettingsSection } from "./sections/graph-display-section";
import { NodeCreationSettingsSection } from "./sections/node-creation-section";
import { PropertyDisplaySettingsSection } from "./sections/property-display-section";
import { RulesSection } from "./sections/rules-section";
import { UserInterfaceSettingsSection } from "./sections/user-interface-section";
import type { SettingsSection } from "./types";

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
			const navContainer = containerEl.createDiv("nexus-settings-nav");

			this.sections.forEach((section) => {
				const button = navContainer.createEl("button", {
					text: section.label,
					cls: "nexus-settings-nav-button",
				});

				if (this.selectedSectionId === section.id) {
					button.addClass("nexus-settings-nav-button-active");
				}

				button.addEventListener("click", () => {
					this.selectedSectionId = section.id;
					this.display();
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
			new RulesSection(this.plugin, this.uiBuilder),
			new DirectoriesSection(this.plugin, this.uiBuilder),
			new DirectRelationshipsSection(this.uiBuilder),
			new NodeCreationSettingsSection(this.plugin, this.uiBuilder),
			new ExamplesSection(this.plugin),
		];
	}
}
