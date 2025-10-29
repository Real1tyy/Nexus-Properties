export type ToggleChangeHandler = (checked: boolean) => Promise<void>;
export type InputUpdateHandler = (value: string) => Promise<void>;

export const createRuleToggle = (checked: boolean, onChange: ToggleChangeHandler): HTMLInputElement => {
	const toggle = document.createElement("input");
	toggle.type = "checkbox";
	toggle.checked = checked;
	toggle.onchange = async () => {
		await onChange(toggle.checked);
	};
	return toggle;
};

export const createRuleInput = (
	value: string,
	placeholder: string,
	cssClass: string,
	onUpdate: InputUpdateHandler
): HTMLInputElement => {
	const input = document.createElement("input");
	input.type = "text";
	input.value = value;
	input.placeholder = placeholder;
	input.className = cssClass;

	const triggerUpdate = () => {
		void onUpdate(input.value);
	};

	input.addEventListener("blur", triggerUpdate);
	input.addEventListener("keydown", (event: KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			triggerUpdate();
		}
	});

	return input;
};

interface MoveButtonOptions {
	container: HTMLElement;
	index: number;
	totalCount: number;
	onMoveUp: () => Promise<void>;
	onMoveDown: () => Promise<void>;
}

export const createMoveButtons = ({ container, index, totalCount, onMoveUp, onMoveDown }: MoveButtonOptions): void => {
	if (index > 0) {
		const moveUpButton = container.createEl("button", {
			text: "↑",
			attr: { title: "Move up" },
			cls: "color-rule-btn",
		});
		moveUpButton.onclick = () => {
			void onMoveUp();
		};
	}

	if (index < totalCount - 1) {
		const moveDownButton = container.createEl("button", {
			text: "↓",
			attr: { title: "Move down" },
			cls: "color-rule-btn",
		});
		moveDownButton.onclick = () => {
			void onMoveDown();
		};
	}
};

export const createDeleteButton = (
	container: HTMLElement,
	onDelete: () => Promise<void>,
	options?: { buttonClass?: string }
): void => {
	const deleteButton = container.createEl("button", {
		text: "×",
		attr: { title: "Delete rule" },
		cls: options?.buttonClass ?? "color-rule-btn color-rule-btn-delete",
	});
	deleteButton.onclick = () => {
		void onDelete();
	};
};

export const swapRules = <T extends { id: string }>(rules: T[], ruleId: string, offset: number): T[] => {
	const currentRules = [...rules];
	const ruleIndex = currentRules.findIndex((rule) => rule.id === ruleId);
	const targetIndex = ruleIndex + offset;

	if (ruleIndex !== -1 && targetIndex >= 0 && targetIndex < currentRules.length) {
		[currentRules[ruleIndex], currentRules[targetIndex]] = [currentRules[targetIndex], currentRules[ruleIndex]];
	}

	return currentRules;
};
