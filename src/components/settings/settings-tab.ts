import { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { type App, PluginSettingTab } from "obsidian";

import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";
import { cls } from "../../utils/css";
import { BasesViewSettingsSection } from "./sections/bases-view-section";
import { GeneralSection } from "./sections/general-section";
import { GraphDisplaySettingsSection } from "./sections/graph-display-section";
import { PropertiesSection } from "./sections/properties-section";
import { RulesSection } from "./sections/rules-section";
import type { SettingsSection } from "./types";

const DOCS_URL = "https://real1tyy.github.io/Nexus-Properties/";
const CHANGELOG_URL = "https://real1tyy.github.io/Nexus-Properties/changelog";
const SPONSOR_URL = "https://matejvavroproductivity.com/support/";
const VIDEO_URL = "https://www.youtube.com/watch?v=Im0SfuBHamo";

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
			const navContainer = containerEl.createDiv(cls("settings-nav"));

			this.sections.forEach((section) => {
				const button = navContainer.createEl("button", {
					text: section.label,
					cls: cls("settings-nav-button"),
				});

				if (this.selectedSectionId === section.id) {
					button.addClass(cls("settings-nav-button-active"));
				}

				button.addEventListener("click", () => {
					this.selectedSectionId = section.id;
					this.display();
				});
			});
		}

		this.sectionContainer = containerEl.createDiv({
			cls: cls("settings-section-container"),
		});
		this.renderSelectedSection();

		const footerEl = containerEl.createDiv({
			cls: `setting-item ${cls("settings-footer")}`,
		});
		const linksContainer = footerEl.createDiv(cls("settings-footer-links"));

		linksContainer.createEl("a", {
			text: "Documentation",
			href: DOCS_URL,
			cls: cls("settings-support-link"),
			attr: { target: "_blank", rel: "noopener" },
		});

		linksContainer.createEl("a", {
			text: "Changelog",
			href: CHANGELOG_URL,
			cls: cls("settings-support-link"),
			attr: { target: "_blank", rel: "noopener" },
		});

		linksContainer.createEl("a", {
			text: "Video Tutorials",
			href: VIDEO_URL,
			cls: cls("settings-support-link"),
			attr: { target: "_blank", rel: "noopener" },
		});

		linksContainer.createEl("a", {
			text: "Support",
			href: SPONSOR_URL,
			cls: cls("settings-support-link"),
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
			new GeneralSection(this.plugin, this.uiBuilder),
			new GraphDisplaySettingsSection(this.uiBuilder),
			new PropertiesSection(this.uiBuilder),
			new BasesViewSettingsSection(this.plugin, this.uiBuilder),
			new RulesSection(this.plugin, this.uiBuilder),
		];
	}
}
