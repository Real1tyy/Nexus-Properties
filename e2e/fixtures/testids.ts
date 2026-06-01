// Single source of truth for every `data-testid` stamped by Nexus-Properties
// source. Specs import `TID.*` instead of splicing `nexus-*` strings by hand.
//
// As the source grows test surfaces (settings tabs, view tabs, modal buttons,
// graph header controls), every new id gets added here AND to the source DOM
// simultaneously. TypeScript catches drift at build time, not as a flaky
// runtime selector miss.
//
// This registry intentionally starts minimal — the pilot adds ids organically
// as specs need them.

export type SettingsTabKey = "general" | "properties" | "graph" | "bases" | "moc" | "rules" | "statistics";

export type ViewTabKey = "graph" | "bases" | "moc";

export type NodeCreationModalBtnKey = "create" | "cancel";

export const TID = {
	settings: {
		tab: (id: SettingsTabKey) => `nexus-settings-tab-${id}`,
	},
	view: {
		tab: (id: ViewTabKey) => `nexus-view-tab-${id}`,
		switcherRoot: "nexus-view-switcher",
	},
	nodeCreation: {
		modalRoot: "nexus-node-creation-modal",
		input: "nexus-node-creation-input",
		btn: (id: NodeCreationModalBtnKey) => `nexus-node-creation-btn-${id}`,
	},
	graph: {
		root: "nexus-graph-root",
		searchInput: "nexus-graph-search",
		filterInput: "nexus-graph-filter",
	},
} as const;

export const sel = (tid: string): string => `[data-testid="${tid}"]`;
