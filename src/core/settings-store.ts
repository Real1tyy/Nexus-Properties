import { SettingsStore as GenericSettingsStore } from "@real1ty-obsidian-plugins";
import type { Plugin } from "obsidian";
import { NexusPropertiesSettingsSchema } from "../types/settings";

export class SettingsStore extends GenericSettingsStore<typeof NexusPropertiesSettingsSchema> {
	constructor(plugin: Plugin) {
		super(plugin, NexusPropertiesSettingsSchema);
	}
}
