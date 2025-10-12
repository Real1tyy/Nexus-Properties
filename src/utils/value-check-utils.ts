export function isEmptyValue(value: unknown): boolean {
	if (value === null || value === undefined) {
		return true;
	}

	if (typeof value === "string" && value.trim() === "") {
		return true;
	}

	if (Array.isArray(value) && value.length === 0) {
		return true;
	}

	return false;
}
