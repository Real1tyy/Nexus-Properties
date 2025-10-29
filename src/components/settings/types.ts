export interface SettingsSection {
	id: string;
	label: string;
	render(container: HTMLElement): void;
}
