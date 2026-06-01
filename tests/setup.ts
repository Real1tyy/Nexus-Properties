import "@real1ty-obsidian-plugins/testing/setup-window";

import { beforeEach } from "vitest";

// Obsidian augments HTMLElement.prototype at runtime with helpers like
// `createDiv`, `addClass`, `empty`, `setText`. Source code relies on them; the
// DOM spec does not provide them. Polyfill here so RTL + happy-dom tests can
// mount real components.
function polyfillObsidianDOM(): void {
	if (typeof HTMLElement === "undefined") return;
	const proto = HTMLElement.prototype as any;
	if (proto.createDiv) return;

	type ElOptions = {
		text?: string;
		cls?: string | string[];
		attr?: Record<string, string>;
		type?: string;
		value?: string;
		placeholder?: string;
		href?: string;
	};

	function applyClass(el: HTMLElement, cls: string | string[] | undefined): void {
		if (!cls) return;
		el.className = Array.isArray(cls) ? cls.join(" ") : cls;
	}

	function applyOptions(el: HTMLElement, options?: ElOptions): void {
		if (!options) return;
		if (options.text !== undefined) el.textContent = options.text;
		applyClass(el, options.cls);
		if (options.attr) {
			for (const [k, v] of Object.entries(options.attr)) {
				el.setAttribute(k, v);
			}
		}
		if (options.type !== undefined) el.setAttribute("type", options.type);
		if (options.value !== undefined) (el as HTMLInputElement).value = options.value;
		if (options.placeholder !== undefined) el.setAttribute("placeholder", options.placeholder);
		if (options.href !== undefined) el.setAttribute("href", options.href);
	}

	proto.empty = function (this: HTMLElement) {
		this.replaceChildren();
	};

	proto.setText = function (this: HTMLElement, text: string) {
		this.textContent = text;
	};

	proto.appendText = function (this: HTMLElement, text: string) {
		this.appendChild(document.createTextNode(text));
	};

	proto.setAttr = function (this: HTMLElement, name: string, value: string) {
		this.setAttribute(name, value);
	};

	proto.addClass = function (this: HTMLElement, ...classes: string[]) {
		this.classList.add(...classes);
	};

	proto.removeClass = function (this: HTMLElement, ...classes: string[]) {
		this.classList.remove(...classes);
	};

	proto.toggleClass = function (this: HTMLElement, cls: string, force?: boolean) {
		this.classList.toggle(cls, force);
	};

	function createAndAppend(parent: HTMLElement, tag: string, arg?: string | ElOptions): HTMLElement {
		const el = document.createElement(tag);
		if (typeof arg === "string") {
			el.className = arg;
		} else if (arg) {
			applyOptions(el, arg);
		}
		parent.appendChild(el);
		return el;
	}

	proto.createDiv = function (this: HTMLElement, arg?: string | ElOptions) {
		return createAndAppend(this, "div", arg);
	};

	proto.createSpan = function (this: HTMLElement, arg?: string | ElOptions) {
		return createAndAppend(this, "span", arg);
	};

	proto.createEl = function (this: HTMLElement, tag: string, options?: ElOptions) {
		return createAndAppend(this, tag, options);
	};

	(window as any).createDiv = function (arg?: string | ElOptions) {
		const div = document.createElement("div");
		if (typeof arg === "string") div.className = arg;
		else if (arg) applyOptions(div, arg);
		return div;
	};
}

polyfillObsidianDOM();

// Source uses Obsidian popout-window globals (`activeDocument`, `activeWindow`).
// In tests there is only one window so they all alias the global. Reach via
// `globalThis` because in the node project `window` itself is undefined at
// module-load.
const _g = globalThis as unknown as Record<string, unknown>;
if (typeof _g["window"] === "undefined") _g["window"] = globalThis;
if (typeof document !== "undefined" && typeof _g["activeDocument"] === "undefined") {
	_g["activeDocument"] = document;
}
if (typeof _g["activeWindow"] === "undefined") _g["activeWindow"] = globalThis;

beforeEach(() => {
	if (typeof document !== "undefined") {
		document.body.replaceChildren();
	}
});
