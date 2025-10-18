import type { SettingsStore } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";
import type { ZodObject, ZodRawShape, z } from "zod";

interface SettingConfig {
	key: string;
	name: string;
	desc: string;
	placeholder?: string;
	min?: number;
	max?: number;
	step?: number;
	multiline?: boolean;
	arrayDelimiter?: string;
}

export class SettingsUIBuilder<TSchema extends ZodObject<ZodRawShape>> {
	constructor(private settingsStore: SettingsStore<TSchema>) {}

	private get settings(): z.infer<TSchema> {
		return this.settingsStore.currentSettings;
	}

	private async updateSetting(key: keyof z.infer<TSchema>, value: unknown): Promise<void> {
		await this.settingsStore.updateSettings(
			(s) =>
				({
					...s,
					[key]: value,
				}) as z.infer<TSchema>
		);
	}

	addToggle(containerEl: HTMLElement, config: SettingConfig): void {
		const { key, name, desc } = config;
		const value = this.settings[key as keyof z.infer<TSchema>];

		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(value as boolean).onChange(async (newValue) => {
					await this.updateSetting(key as keyof z.infer<TSchema>, newValue);
				})
			);
	}

	addSlider(containerEl: HTMLElement, config: SettingConfig): void {
		const { key, name, desc, min = 0, max = 100, step = 1 } = config;
		const value = this.settings[key as keyof z.infer<TSchema>];

		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addSlider((slider) =>
				slider
					.setLimits(min, max, step)
					.setValue(value as number)
					.setDynamicTooltip()
					.onChange(async (newValue) => {
						await this.updateSetting(key as keyof z.infer<TSchema>, newValue);
					})
			);
	}

	addText(containerEl: HTMLElement, config: SettingConfig): void {
		const { key, name, desc, placeholder = "" } = config;
		const value = this.settings[key as keyof z.infer<TSchema>];

		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) =>
				text
					.setPlaceholder(placeholder)
					.setValue(value as string)
					.onChange(async (newValue) => {
						await this.updateSetting(key as keyof z.infer<TSchema>, newValue);
					})
			);
	}

	addTextArray(containerEl: HTMLElement, config: SettingConfig): void {
		const { key, name, desc, placeholder = "", arrayDelimiter = ", ", multiline = false } = config;
		const value = this.settings[key as keyof z.infer<TSchema>] as string[];

		const setting = new Setting(containerEl).setName(name).setDesc(desc);

		if (multiline) {
			setting.addTextArea((text) => {
				text.setPlaceholder(placeholder);
				text.setValue(value.join("\n"));

				const commit = async (inputValue: string) => {
					const items = inputValue
						.split("\n")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					await this.updateSetting(key as keyof z.infer<TSchema>, items);
				};

				text.inputEl.addEventListener("blur", () => void commit(text.inputEl.value));
				text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
					if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						void commit(text.inputEl.value);
					}
				});

				text.inputEl.rows = 5;
				text.inputEl.addClass("settings-info-box-example");
			});
		} else {
			setting.addText((text) => {
				text.setPlaceholder(placeholder);
				text.setValue(value.join(arrayDelimiter));
				text.onChange(async (inputValue) => {
					const items = inputValue
						.split(",")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					await this.updateSetting(key as keyof z.infer<TSchema>, items);
				});
				text.inputEl.addClass("nexus-property-input");
			});
		}
	}

	/**
	 * Automatically detect the type from current value and create appropriate control
	 */
	auto(containerEl: HTMLElement, config: SettingConfig): void {
		const value = this.settings[config.key as keyof z.infer<TSchema>];

		// Detect type from current value
		if (typeof value === "boolean") {
			this.addToggle(containerEl, config);
		} else if (typeof value === "number") {
			this.addSlider(containerEl, config);
		} else if (typeof value === "string") {
			this.addText(containerEl, config);
		} else if (Array.isArray(value)) {
			this.addTextArray(containerEl, config);
		} else {
			console.warn(`Unsupported value type for key ${config.key}: ${typeof value}`);
		}
	}
}
