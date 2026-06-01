import { BehaviorSubject } from "rxjs";

import { NexusPropertiesSettingsSchema, type NexusPropertiesSettings } from "../../src/types/settings";

let cachedDefaults: NexusPropertiesSettings | undefined;
function parsedDefaults(): NexusPropertiesSettings {
	if (!cachedDefaults) {
		cachedDefaults = NexusPropertiesSettingsSchema.parse({});
	}
	return cachedDefaults;
}

/**
 * Build a settings object from schema defaults with optional overrides.
 * Always returns a fresh deep copy — mutations in a test don't leak between cases.
 */
export function createMockSettings(overrides: Partial<NexusPropertiesSettings> = {}): NexusPropertiesSettings {
	return { ...structuredClone(parsedDefaults()), ...overrides };
}

/**
 * Build a BehaviorSubject pre-loaded with mock settings. Use this when a
 * subject-of-truth is needed (Indexer, PropertiesManager, NodeCreator).
 */
export function createMockSettingsSubject(
	overrides: Partial<NexusPropertiesSettings> = {}
): BehaviorSubject<NexusPropertiesSettings> {
	return new BehaviorSubject(createMockSettings(overrides));
}

/**
 * Minimal SettingsStore shape implementing the SettingsStore<Schema> contract
 * that hierarchy provider / view code consumes. Functional update path so
 * subscribers receive new values.
 */
export interface MockSettingsStore {
	settings$: BehaviorSubject<NexusPropertiesSettings>;
	readonly currentSettings: NexusPropertiesSettings;
	updateSettings(updater: (s: NexusPropertiesSettings) => NexusPropertiesSettings): Promise<void>;
}

export function createMockSettingsStore(overrides: Partial<NexusPropertiesSettings> = {}): MockSettingsStore {
	const settings$ = new BehaviorSubject(createMockSettings(overrides));
	return {
		settings$,
		get currentSettings() {
			return settings$.value;
		},
		async updateSettings(updater) {
			settings$.next(updater(settings$.value));
		},
	};
}
