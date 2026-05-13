import { buildUtmUrl, type SettingsSection, SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { SettingsNav, type SettingsNavTab } from "@real1ty-obsidian-plugins-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { BasesViewSettingsSection } from "../../components/settings/sections/bases-view-section";
import { GeneralSection } from "../../components/settings/sections/general-section";
import { GraphDisplaySettingsSection } from "../../components/settings/sections/graph-display-section";
import { MocSection } from "../../components/settings/sections/moc-section";
import { PropertiesSection } from "../../components/settings/sections/properties-section";
import { RulesSection } from "../../components/settings/sections/rules-section";
import { StatisticsSection } from "../../components/settings/sections/statistics-section";
import type NexusPropertiesPlugin from "../../main";
import type { NexusPropertiesSettingsSchema } from "../../types/settings";

interface SettingsRootProps {
	plugin: NexusPropertiesPlugin;
}

const TABS: SettingsNavTab[] = [
	{ id: "general", label: "General" },
	{ id: "properties", label: "Properties" },
	{ id: "graph", label: "Graph" },
	{ id: "bases", label: "Bases" },
	{ id: "moc", label: "MOC" },
	{ id: "rules", label: "Rules" },
	{ id: "statistics", label: "Statistics" },
];

const FOOTER_LINKS = [
	{
		text: "Documentation",
		href: buildUtmUrl(
			"https://real1tyy.github.io/Nexus-Properties/",
			"nexus-properties",
			"plugin",
			"settings",
			"documentation"
		),
	},
	{
		text: "Changelog",
		href: buildUtmUrl(
			"https://real1tyy.github.io/Nexus-Properties/changelog",
			"nexus-properties",
			"plugin",
			"settings",
			"changelog"
		),
	},
	{
		text: "Other Plugins",
		href: buildUtmUrl(
			"https://matejvavroproductivity.com/tools/",
			"nexus-properties",
			"plugin",
			"settings",
			"other_plugins"
		),
	},
	{
		text: "Support",
		href: buildUtmUrl(
			"https://matejvavroproductivity.com/support/",
			"nexus-properties",
			"plugin",
			"settings",
			"support"
		),
	},
	{
		text: "Playlist",
		href: buildUtmUrl(
			"https://www.youtube.com/playlist?list=PLMVJknbUasLC_wSYpzTG2TpqXSq_2B8Be",
			"nexus-properties",
			"plugin",
			"settings",
			"youtube"
		),
	},
];

export const SettingsRoot = memo(function SettingsRoot({ plugin }: SettingsRootProps) {
	const [activeTab, setActiveTab] = useState("general");
	const sectionsRef = useRef<Map<string, SettingsSection>>(new Map());

	if (sectionsRef.current.size === 0) {
		const uiBuilder = new SettingsUIBuilder<typeof NexusPropertiesSettingsSchema>(plugin.settingsStore as never);
		const instances = {
			general: new GeneralSection(plugin, uiBuilder),
			properties: new PropertiesSection(uiBuilder),
			graph: new GraphDisplaySettingsSection(uiBuilder),
			bases: new BasesViewSettingsSection(plugin, uiBuilder),
			moc: new MocSection(uiBuilder),
			rules: new RulesSection(plugin, uiBuilder),
			statistics: new StatisticsSection(plugin),
		};
		const sections: SettingsSection[] = [
			{ id: "general", label: "General", display: (el) => instances.general.render(el) },
			{ id: "properties", label: "Properties", display: (el) => instances.properties.render(el) },
			{ id: "graph", label: "Graph", display: (el) => instances.graph.render(el) },
			{ id: "bases", label: "Bases", display: (el) => instances.bases.render(el) },
			{ id: "moc", label: "MOC", display: (el) => instances.moc.render(el) },
			{ id: "rules", label: "Rules", display: (el) => instances.rules.render(el) },
			{ id: "statistics", label: "Statistics", display: (el) => instances.statistics.render(el) },
		];
		for (const s of sections) sectionsRef.current.set(s.id, s);
	}

	return (
		<SettingsNav tabs={TABS} activeId={activeTab} onChange={setActiveTab} footerLinks={FOOTER_LINKS}>
			<ImperativeSection section={sectionsRef.current.get(activeTab)} />
		</SettingsNav>
	);
});

const ImperativeSection = memo(function ImperativeSection({ section }: { section: SettingsSection | undefined }) {
	const ref = useRef<HTMLDivElement>(null);
	const prevRef = useRef<SettingsSection | undefined>(undefined);

	const mount = useCallback(() => {
		if (!ref.current || !section) return;
		prevRef.current?.hide?.();
		ref.current.replaceChildren();
		section.display(ref.current);
		prevRef.current = section;
	}, [section]);

	useEffect(() => {
		mount();
		return () => prevRef.current?.hide?.();
	}, [mount]);

	return <div ref={ref} />;
});
