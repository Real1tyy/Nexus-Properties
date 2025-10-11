import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { type App, Modal, Notice, TFile } from "obsidian";
import type { FileRelationships, Indexer } from "../core/indexer";
import { extractDisplayName, extractFilePath } from "../utils/file-name-extractor";

export class RelationshipGraphModal extends Modal {
	private cy: Core | null = null;
	private graphContainerEl: HTMLElement | null = null;

	constructor(
		app: App,
		private indexer: Indexer,
		private file: TFile
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;

		// Check if file should be indexed based on directory settings
		if (!this.indexer.shouldIndexFile(this.file.path)) {
			new Notice("This file is not in a configured directory for relationship tracking.");
			this.close();
			return;
		}

		const { frontmatter } = this.app.metadataCache.getFileCache(this.file) ?? {};

		if (!frontmatter) {
			new Notice("This file has no frontmatter properties.");
			this.close();
			return;
		}

		const relationships = this.indexer.extractRelationships(this.file, frontmatter);
		const { nodes, edges } = this.buildGraphData(this.file.path, relationships);

		this.modalEl.addClass("nexus-graph-modal");
		contentEl.addClass("nexus-graph-modal-content");

		const header = contentEl.createEl("div", { cls: "nexus-graph-modal-header" });
		header.createEl("h2", { text: `Relationship Graph: ${this.file.basename}` });

		this.graphContainerEl = contentEl.createEl("div", {
			cls: "nexus-graph-modal-container",
		});

		this.initializeCytoscape();
		this.renderGraph(nodes, edges);
	}

	onClose(): void {
		if (this.cy) {
			this.cy.destroy();
			this.cy = null;
		}
		this.graphContainerEl = null;
		const { contentEl } = this;
		contentEl.empty();
	}

	private initializeCytoscape(): void {
		if (!this.graphContainerEl) return;

		// Resolve CSS variables to actual colors for Cytoscape
		const styles = getComputedStyle(document.body);
		const accentColor = styles.getPropertyValue("--interactive-accent").trim() || "#7c3aed";
		const accentHover = styles.getPropertyValue("--interactive-accent-hover").trim() || "#8b5cf6";
		const textColor = styles.getPropertyValue("--text-normal").trim() || "#dcddde";
		const borderColor = styles.getPropertyValue("--background-modifier-border").trim() || "#424242";

		this.cy = cytoscape({
			container: this.graphContainerEl,
			style: [
				{
					selector: "node",
					style: {
						"background-color": accentColor,
						label: "data(label)",
						"text-valign": "center",
						"text-halign": "center",
						color: textColor,
						"font-size": "14px",
						width: "100px",
						height: "50px",
						shape: "roundrectangle",
						"border-width": "2px",
						"border-color": borderColor,
						"text-wrap": "wrap",
						"text-max-width": "90px",
					},
				},
				{
					selector: "node[level = 0]",
					style: {
						"background-color": accentHover,
						"border-color": accentColor,
						"border-width": "4px",
						width: "130px",
						height: "60px",
						"font-weight": "bold",
						"font-size": "16px",
					},
				},
				{
					selector: "edge",
					style: {
						width: 3,
						"line-color": borderColor,
						"target-arrow-color": borderColor,
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
				{
					selector: "edge[type = 'parent']",
					style: {
						"line-color": "#e74c3c",
						"target-arrow-color": "#e74c3c",
					},
				},
				{
					selector: "edge[type = 'child']",
					style: {
						"line-color": "#2ecc71",
						"target-arrow-color": "#2ecc71",
					},
				},
				{
					selector: "edge[type = 'related']",
					style: {
						"line-color": "#3498db",
						"target-arrow-color": "#3498db",
						"line-style": "dashed",
					},
				},
			],
			layout: {
				name: "grid",
			},
		});

		// Add click handler to open files
		this.cy.on("tap", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const file = this.app.vault.getAbstractFileByPath(filePath);

			if (file instanceof TFile) {
				this.close();
				this.app.workspace.getLeaf(false).openFile(file);
			}
		});
	}

	private renderGraph(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
		if (!this.cy) return;

		// Add elements to graph
		this.cy.add([...nodes, ...edges]);

		// Apply hierarchical layout
		this.cy
			.layout({
				name: "breadthfirst",
				directed: true,
				roots: [`#${CSS.escape(this.file.path)}`],
				spacingFactor: 2,
				animate: true,
				animationDuration: 500,
				fit: true,
				padding: 50,
			})
			.run();
	}

	private buildGraphData(
		rootPath: string,
		relationships: FileRelationships
	): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const addedNodes = new Set<string>();
		const processedNodes = new Set<string>();

		const addNode = (pathOrWikiLink: string, level: number): void => {
			// Extract the actual file path (handles wiki links with aliases)
			const filePath = extractFilePath(pathOrWikiLink);

			if (addedNodes.has(filePath)) return;
			addedNodes.add(filePath);

			// Extract the display name (alias if present, otherwise filename)
			const displayName = extractDisplayName(pathOrWikiLink);

			nodes.push({
				data: {
					id: filePath,
					label: displayName,
					level: level,
				},
			});
		};

		// Helper function to recursively add relationships
		const addRelationships = (filePath: string, currentLevel: number, maxDepth = 3): void => {
			// Prevent infinite recursion on circular relationships
			if (Math.abs(currentLevel) > maxDepth) return;
			if (processedNodes.has(filePath)) return;

			processedNodes.add(filePath);

			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return;

			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter;
			if (!frontmatter) return;

			const rels = this.indexer.extractRelationships(file, frontmatter);

			// Add parents (going up in hierarchy)
			for (const parentWikiLink of rels.allParents) {
				if (!parentWikiLink) continue;

				// Extract the actual file path from the wiki link
				const parentPath = extractFilePath(parentWikiLink);

				addNode(parentWikiLink, currentLevel - 1);
				edges.push({
					data: {
						source: parentPath,
						target: filePath,
						type: "parent",
					},
				});

				// Recursively add parent's relationships
				addRelationships(parentPath, currentLevel - 1, maxDepth);
			}

			// Add children (going down in hierarchy)
			for (const childWikiLink of rels.allChildren) {
				if (!childWikiLink) continue;

				// Extract the actual file path from the wiki link
				const childPath = extractFilePath(childWikiLink);

				addNode(childWikiLink, currentLevel + 1);
				edges.push({
					data: {
						source: filePath,
						target: childPath,
						type: "child",
					},
				});

				// Recursively add child's relationships
				addRelationships(childPath, currentLevel + 1, maxDepth);
			}

			// Add related (same level)
			for (const relatedWikiLink of rels.allRelated) {
				if (!relatedWikiLink) continue;

				// Extract the actual file path from the wiki link
				const relatedPath = extractFilePath(relatedWikiLink);

				addNode(relatedWikiLink, currentLevel);
				edges.push({
					data: {
						source: filePath,
						target: relatedPath,
						type: "related",
					},
				});

				// Don't recursively add related relationships to avoid cluttering
			}
		};

		// Start with root node
		addNode(rootPath, 0);

		// Build the graph recursively
		addRelationships(rootPath, 0);

		return { nodes, edges };
	}
}
