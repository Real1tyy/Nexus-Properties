import {
	formatWikiLink,
	generateUniqueFilePath,
	generateZettelId,
	normalizeProperty,
	removeLinkFromProperty,
} from "@real1ty-obsidian-plugins";
import { type App, TFile } from "obsidian";
import { RELATIONSHIP_CONFIGS, type NodeCreationType, type RelationshipType } from "../../types/constants";
import type { Frontmatter, NexusPropertiesSettings } from "../../types/settings";
import { buildFilePathForWikiLink } from "../../utils/file-utils";
import { buildTitleLink } from "../../utils/string-utils";
import type { Command } from "./command";

/**
 * Command to create a new node with a relationship to an existing node.
 * Creates a file and sets up bidirectional relationships.
 */
export class CreateNodeCommand implements Command {
	private createdFilePath: string | null = null;

	constructor(
		private app: App,
		private sourceFilePath: string,
		private nodeType: NodeCreationType,
		private nodeName: string,
		private settings: NexusPropertiesSettings
	) {}

	async execute(): Promise<void> {
		const sourceFile = this.app.vault.getAbstractFileByPath(this.sourceFilePath);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${this.sourceFilePath}`);
		}

		const sourceFrontmatter = this.app.metadataCache.getFileCache(sourceFile)?.frontmatter || {};
		const folder = sourceFile.parent?.path || "";
		const finalPath = generateUniqueFilePath(this.app, folder, this.nodeName);

		const newFile = await this.app.vault.create(finalPath, "");
		this.createdFilePath = newFile.path;

		await this.setupNewFileFrontmatter(sourceFile, newFile, sourceFrontmatter);
		await this.setupSourceFileRelationship(sourceFile, newFile);
	}

	async undo(): Promise<void> {
		if (!this.createdFilePath) {
			throw new Error("No file was created to undo");
		}

		const createdFile = this.app.vault.getAbstractFileByPath(this.createdFilePath);
		if (!(createdFile instanceof TFile)) {
			throw new Error(`Created file not found: ${this.createdFilePath}`);
		}

		const sourceFile = this.app.vault.getAbstractFileByPath(this.sourceFilePath);
		if (sourceFile instanceof TFile) {
			const newFilePath = buildFilePathForWikiLink(createdFile);
			const relationshipType: RelationshipType = this.nodeType === "child" ? "children" : this.nodeType;
			const config = RELATIONSHIP_CONFIGS.find((c) => c.type === relationshipType);

			if (config) {
				const propName = config.getProp(this.settings);
				await this.app.fileManager.processFrontMatter(sourceFile, (fm: Frontmatter) => {
					const currentValue = fm[propName] as string | string[] | undefined;
					fm[propName] = removeLinkFromProperty(currentValue, newFilePath);
				});
			}
		}

		await this.app.vault.trash(createdFile, true);
		this.createdFilePath = null;
	}

	getType(): string {
		return `Create ${this.nodeType} node`;
	}

	async canUndo(): Promise<boolean> {
		if (!this.createdFilePath) {
			return false;
		}
		const createdFile = this.app.vault.getAbstractFileByPath(this.createdFilePath);
		return createdFile instanceof TFile;
	}

	getCreatedFilePath(): string | null {
		return this.createdFilePath;
	}

	private async setupNewFileFrontmatter(
		sourceFile: TFile,
		newFile: TFile,
		sourceFrontmatter: Frontmatter
	): Promise<void> {
		const sourceFilePath = buildFilePathForWikiLink(sourceFile);
		const sourceLink = formatWikiLink(sourceFilePath);

		await this.app.fileManager.processFrontMatter(newFile, (fm: Frontmatter) => {
			this.copyPropertiesExcludingRelationships(fm, sourceFrontmatter, sourceFile.path);
			fm[this.settings.zettelIdProp] = generateZettelId();
			this.setupRelationship(fm, sourceLink, this.nodeType, true);
			this.setCorrectTitle(fm, newFile, sourceLink);
		});
	}

	private async setupSourceFileRelationship(sourceFile: TFile, newFile: TFile): Promise<void> {
		const newFilePath = buildFilePathForWikiLink(newFile);
		const newFileLink = formatWikiLink(newFilePath);

		await this.app.fileManager.processFrontMatter(sourceFile, (fm: Frontmatter) => {
			this.setupRelationship(fm, newFileLink, this.nodeType, false);
		});
	}

	private copyPropertiesExcludingRelationships(target: Frontmatter, source: Frontmatter, sourceFilePath: string): void {
		const excludedProperties = this.evaluateExcludedProperties(sourceFilePath);
		const excludeProps = new Set(excludedProperties);

		for (const [key, value] of Object.entries(source)) {
			if (!excludeProps.has(key)) {
				target[key] = value;
			} else {
				target[key] = null;
			}
		}
	}

	private evaluateExcludedProperties(filePath: string): string[] {
		const excludedProperties = [...this.settings.defaultExcludedProperties];
		const enabledRules = this.settings.pathExcludedProperties.filter((rule) => rule.enabled);
		const match = enabledRules.find((rule) => filePath.startsWith(rule.path));

		if (match) {
			for (const prop of match.excludedProperties) {
				if (!excludedProperties.includes(prop)) {
					excludedProperties.push(prop);
				}
			}
		}

		return excludedProperties;
	}

	private setCorrectTitle(fm: Frontmatter, newFile: TFile, parentLink: string): void {
		if (this.settings.titlePropertyMode !== "enabled") {
			return;
		}
		const titleLink = buildTitleLink(newFile.path, [parentLink]);
		fm[this.settings.titleProp] = titleLink;
	}

	private setupRelationship(fm: Frontmatter, link: string, type: NodeCreationType, isNewFile: boolean): void {
		const relationshipType: RelationshipType = type === "child" ? "children" : type;
		const config = RELATIONSHIP_CONFIGS.find((c) => c.type === relationshipType);

		if (!config) {
			console.error(`No relationship config found for type: ${relationshipType}`);
			return;
		}

		const propName = isNewFile ? config.getReverseProp(this.settings) : config.getProp(this.settings);
		const currentArray = normalizeProperty(fm[propName]);

		if (!currentArray.includes(link)) {
			currentArray.push(link);
			fm[propName] = currentArray;
		}
	}
}
