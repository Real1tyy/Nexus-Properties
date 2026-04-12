import { cls } from "../../constants";
import { InputFilterManager } from "./base";

export class MocSearch extends InputFilterManager {
	constructor(parentEl: HTMLElement, onSearchChange: () => void) {
		super(parentEl, "Search nodes by name...", cls("moc-search-input"), onSearchChange, true, undefined, 300);
		this.persistentlyVisible = true;
	}

	shouldInclude(nodeName: string): boolean {
		if (!this.currentValue) return true;
		return nodeName.toLowerCase().includes(this.currentValue.toLowerCase());
	}
}
