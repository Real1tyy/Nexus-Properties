/**
 * Formats a property value for display, handling different data types.
 *
 * @param value - The value to format
 * @returns A string representation of the value suitable for display
 */
export function formatPropertyValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (Array.isArray(value)) {
		return value.join(", ");
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}
