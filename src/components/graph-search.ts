import { InputFilterManager } from "./input-filter-manager";

export class GraphSearch extends InputFilterManager {
	constructor(
		parentEl: HTMLElement,
		onSearchChange: () => void,
		private onClose: () => void,
		initiallyVisible: boolean
	) {
		super(parentEl, "Search nodes by name...", "nexus-graph-search-input", onSearchChange, initiallyVisible);
	}

	shouldInclude(nodeName: string): boolean {
		if (!this.currentValue) return true;
		return nodeName.toLowerCase().includes(this.currentValue.toLowerCase());
	}

	hide(): void {
		super.hide();
		this.onClose();
	}
}
