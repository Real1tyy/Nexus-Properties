import { InputFilterManager } from "./input-filter-manager";

export class GraphSearch extends InputFilterManager {
	constructor(parentEl: HTMLElement, onSearchChange: () => void, initiallyVisible: boolean, onHide?: () => void) {
		super(parentEl, "Search nodes by name...", "nexus-graph-search-input", onSearchChange, initiallyVisible, onHide);
	}

	shouldInclude(nodeName: string): boolean {
		if (!this.currentValue) return true;
		return nodeName.toLowerCase().includes(this.currentValue.toLowerCase());
	}
}
