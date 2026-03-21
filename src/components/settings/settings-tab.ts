import { buildUtmUrl, SettingsNavigation, type SettingsSection, SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { type App, PluginSettingTab } from "obsidian";
import type NexusPropertiesPlugin from "src/main";
import type { NexusPropertiesSettingsSchema } from "src/types/settings";

import { BasesViewSettingsSection } from "./sections/bases-view-section";
import { GeneralSection } from "./sections/general-section";
import { GraphDisplaySettingsSection } from "./sections/graph-display-section";
import { MocSection } from "./sections/moc-section";
import { PropertiesSection } from "./sections/properties-section";
import { RulesSection } from "./sections/rules-section";
import { StatisticsSection } from "./sections/statistics-section";

export class NexusPropertiesSettingsTab extends PluginSettingTab {
	plugin: NexusPropertiesPlugin;

	private readonly navigation: SettingsNavigation;

	constructor(app: App, plugin: NexusPropertiesPlugin) {
		super(app, plugin);
		this.plugin = plugin;

		const uiBuilder = new SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>(this.plugin.settingsStore);

		const settingsInstances = {
			general: new GeneralSection(this.plugin, uiBuilder),
			properties: new PropertiesSection(uiBuilder),
			graph: new GraphDisplaySettingsSection(uiBuilder),
			bases: new BasesViewSettingsSection(this.plugin, uiBuilder),
			moc: new MocSection(uiBuilder),
			rules: new RulesSection(this.plugin, uiBuilder),
			statistics: new StatisticsSection(this.plugin),
		};

		const sections: SettingsSection[] = [
			{ id: "general", label: "General", display: (el) => settingsInstances.general.render(el) },
			{ id: "properties", label: "Properties", display: (el) => settingsInstances.properties.render(el) },
			{ id: "graph", label: "Graph", display: (el) => settingsInstances.graph.render(el) },
			{ id: "bases", label: "Bases", display: (el) => settingsInstances.bases.render(el) },
			{ id: "moc", label: "MOC", display: (el) => settingsInstances.moc.render(el) },
			{ id: "rules", label: "Rules", display: (el) => settingsInstances.rules.render(el) },
			{ id: "statistics", label: "Statistics", display: (el) => settingsInstances.statistics.render(el) },
		];

		this.navigation = new SettingsNavigation({
			cssPrefix: "nexus-properties-",
			sections,
			footerLinks: [
				{
					text: "Documentation",
					href: buildUtmUrl(
						"https://real1tyy.github.io/Nexus-Properties/",
						"nexus-properties",
						"settings",
						"documentation"
					),
				},
				{
					text: "Changelog",
					href: buildUtmUrl(
						"https://real1tyy.github.io/Nexus-Properties/changelog",
						"nexus-properties",
						"settings",
						"changelog"
					),
				},
				{
					text: "Other Plugins",
					href: buildUtmUrl(
						"https://matejvavroproductivity.com/tools/",
						"nexus-properties",
						"settings",
						"product-page"
					),
				},
				{
					text: "Support",
					href: buildUtmUrl("https://matejvavroproductivity.com/support/", "nexus-properties", "settings", "support"),
				},
				{
					text: "Playlist",
					href: buildUtmUrl(
						"https://www.youtube.com/playlist?list=PLMVJknbUasLC_wSYpzTG2TpqXSq_2B8Be",
						"nexus-properties",
						"settings",
						"youtube"
					),
				},
			],
		});
	}

	display(): void {
		this.navigation.display(this.containerEl);
	}
}
