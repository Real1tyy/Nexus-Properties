import {
	ExcludedPropertiesEvaluator,
	formatWikiLink,
	generateUniqueFilePath,
	generateZettelId,
	normalizeProperty,
} from "@real1ty-obsidian-plugins/utils";
import type { App, TFile } from "obsidian";
import type { BehaviorSubject } from "rxjs";
import { RELATIONSHIP_CONFIGS, type RelationshipType } from "../types/constants";
import type { Frontmatter, NexusPropertiesSettings } from "../types/settings";
import { buildFilePathForWikiLink } from "../utils/file-utils";

type NodeCreationType = "parent" | "child" | "related";

export class NodeCreator {
	private excludedPropertiesEvaluator: ExcludedPropertiesEvaluator<NexusPropertiesSettings>;
	private settings: NexusPropertiesSettings;

	constructor(
		private app: App,
		settingsObservable: BehaviorSubject<NexusPropertiesSettings>
	) {
		this.excludedPropertiesEvaluator = new ExcludedPropertiesEvaluator(settingsObservable);
		this.settings = settingsObservable.value;

		settingsObservable.subscribe((settings) => {
			this.settings = settings;
		});
	}

	async createRelatedNode(sourceFile: TFile, type: NodeCreationType): Promise<TFile | null> {
		const autoName = this.generateAutoNodeName(sourceFile.basename, type);
		return this.createRelatedNodeWithName(sourceFile, type, autoName);
	}

	async createRelatedNodeWithName(sourceFile: TFile, type: NodeCreationType, nodeName: string): Promise<TFile | null> {
		try {
			const frontmatter = this.app.metadataCache.getFileCache(sourceFile)?.frontmatter || {};

			const folder = sourceFile.parent?.path || "";
			const finalPath = generateUniqueFilePath(this.app, folder, nodeName);
			const newFile = await this.app.vault.create(finalPath, "");
			await this.setupFrontmatter(sourceFile, newFile, frontmatter, type);

			return newFile;
		} catch (error) {
			console.error(`Error creating ${type} node:`, error);
			return null;
		}
	}

	generateAutoNodeName(sourceBasename: string, type: NodeCreationType): string {
		switch (type) {
			case "parent":
				return ` - ${sourceBasename}`;
			case "child":
				return `${sourceBasename} - `;
			case "related":
				return `${sourceBasename} `;
		}
	}

	private async setupFrontmatter(
		sourceFile: TFile,
		newFile: TFile,
		sourceFrontmatter: Frontmatter,
		type: NodeCreationType
	): Promise<void> {
		const sourceFilePath = buildFilePathForWikiLink(sourceFile);
		const newFilePath = buildFilePathForWikiLink(newFile);

		const sourceLink = formatWikiLink(sourceFilePath);
		const newFileLink = formatWikiLink(newFilePath);

		await this.app.fileManager.processFrontMatter(newFile, (fm) => {
			this.copyPropertiesExcludingRelationships(fm, sourceFrontmatter, sourceFile.path);

			fm[this.settings.zettelIdProp] = generateZettelId();

			this.setupRelationship(fm, sourceLink, type, true);
		});

		await this.app.fileManager.processFrontMatter(sourceFile, (fm) => {
			this.setupRelationship(fm, newFileLink, type, false);
		});
	}

	private copyPropertiesExcludingRelationships(target: Frontmatter, source: Frontmatter, sourceFilePath: string): void {
		const excludedProperties = this.excludedPropertiesEvaluator.evaluateExcludedProperties(sourceFilePath);
		const excludeProps = new Set(excludedProperties);

		for (const [key, value] of Object.entries(source)) {
			if (!excludeProps.has(key)) {
				// Copy the property value
				target[key] = value;
			} else {
				// Keep the property key but set it to undefined
				// This preserves the property structure while clearing the value
				target[key] = "";
			}
		}
	}

	private setupRelationship(fm: Frontmatter, link: string, type: NodeCreationType, isNewFile: boolean): void {
		// Map NodeCreationType to RelationshipType
		const relationshipType: RelationshipType = type === "child" ? "children" : type;

		// Find the relationship config
		const config = RELATIONSHIP_CONFIGS.find((c) => c.type === relationshipType);
		if (!config) {
			console.error(`No relationship config found for type: ${relationshipType}`);
			return;
		}

		// For new file: use reverse property (e.g., parent creates child, child gets Parent prop)
		// For source file: use forward property (e.g., parent creates child, parent gets Child prop)
		const propName = isNewFile ? config.getReverseProp(this.settings) : config.getProp(this.settings);

		const currentArray = normalizeProperty(fm[propName]);

		if (!currentArray.includes(link)) {
			currentArray.push(link);
			fm[propName] = currentArray;
		}
	}
}
