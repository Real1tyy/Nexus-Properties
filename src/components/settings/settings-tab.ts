import { renderReactInline } from "@real1ty-obsidian-plugins-react";
import { type App, PluginSettingTab } from "obsidian";
import { createElement } from "react";

import { CSS_PREFIX } from "../../constants";
import type NexusPropertiesPlugin from "../../main";
import { SettingsRoot } from "../../react/settings/settings-root";

export class NexusPropertiesSettingsTab extends PluginSettingTab {
	plugin: NexusPropertiesPlugin;
	private unmount: (() => void) | null = null;

	constructor(app: App, plugin: NexusPropertiesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override display(): void {
		this.unmount?.();
		this.containerEl.empty();
		this.unmount = renderReactInline(this.containerEl, createElement(SettingsRoot, { plugin: this.plugin }), this.app, {
			cssPrefix: CSS_PREFIX,
		});
	}

	override hide(): void {
		this.unmount?.();
		this.unmount = null;
	}
}
