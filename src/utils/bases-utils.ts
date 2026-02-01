/**
 * Build file path filters for Bases view.
 * Generates OR filter conditions in proper YAML indentation.
 */
export function buildBasesFilePathFilters(filePaths: string[]): string {
	if (filePaths.length === 0) {
		return '        - file.path == ""';
	}
	return filePaths.map((path) => `        - file.path == "${path}"`).join("\n");
}
