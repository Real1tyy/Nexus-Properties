import { describe, expect, it } from "vitest";

import { getInternalNexusProperties, parseExcludedProps } from "../../src/utils/frontmatter-utils";
import { createMockSettings } from "../fixtures";

describe("getInternalNexusProperties", () => {
	it("includes parent, children, related, zettelId, and title", () => {
		const settings = createMockSettings({
			parentProp: "Parent",
			childrenProp: "Child",
			relatedProp: "Related",
			zettelIdProp: "_ZettelID",
			titleProp: "Title",
			prioritizeParentProp: "PrioritizeParent",
		});

		const internal = getInternalNexusProperties(settings);

		expect(internal).toEqual(new Set(["Parent", "Child", "Related", "_ZettelID", "PrioritizeParent", "Title"]));
	});

	it("excludes empty prioritize parent prop", () => {
		const settings = createMockSettings({ prioritizeParentProp: "" });

		const internal = getInternalNexusProperties(settings);

		expect(internal.has("")).toBe(false);
	});

	it("honors renamed property keys", () => {
		const settings = createMockSettings({
			parentProp: "Up",
			childrenProp: "Down",
			relatedProp: "Sibling",
			zettelIdProp: "uid",
			titleProp: "Display",
			prioritizeParentProp: "",
		});

		expect(getInternalNexusProperties(settings)).toEqual(new Set(["Up", "Down", "Sibling", "uid", "Display"]));
	});
});

describe("parseExcludedProps", () => {
	it("merges user excludes with internal props", () => {
		const settings = createMockSettings({
			excludedPropagatedProps: "Status, Priority, Tags",
		});

		const excluded = parseExcludedProps(settings);

		// Internal defaults
		expect(excluded.has("Parent")).toBe(true);
		expect(excluded.has("Child")).toBe(true);
		expect(excluded.has("Related")).toBe(true);
		expect(excluded.has("_ZettelID")).toBe(true);
		expect(excluded.has("Title")).toBe(true);
		// User
		expect(excluded.has("Status")).toBe(true);
		expect(excluded.has("Priority")).toBe(true);
		expect(excluded.has("Tags")).toBe(true);
	});

	it("returns only internal props when user list is empty", () => {
		const settings = createMockSettings({ excludedPropagatedProps: "" });

		const excluded = parseExcludedProps(settings);

		expect(excluded.has("Parent")).toBe(true);
		expect(excluded.size).toBe(getInternalNexusProperties(settings).size);
	});

	it("trims whitespace and drops empty entries", () => {
		const settings = createMockSettings({
			excludedPropagatedProps: "  Status  ,  ,  Priority  , ",
		});

		const excluded = parseExcludedProps(settings);

		expect(excluded.has("Status")).toBe(true);
		expect(excluded.has("Priority")).toBe(true);
		expect(excluded.has("")).toBe(false);
		expect(excluded.has(" ")).toBe(false);
	});

	it.each([
		["Status", true],
		["Priority", true],
		["title", false], // case-sensitive — exact match required
		["", false],
		["Unrelated", false],
	] as const)("excluded.has(%s) === %s for csv 'Status, Priority'", (key, expected) => {
		const settings = createMockSettings({ excludedPropagatedProps: "Status, Priority" });

		expect(parseExcludedProps(settings).has(key)).toBe(expected);
	});
});
