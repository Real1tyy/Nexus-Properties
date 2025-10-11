import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { type App, Modal, Notice, TFile } from "obsidian";
import type { Indexer } from "../core/indexer";
import { getFileContext } from "../utils/file-context";
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

		const { nodes, edges } = this.buildGraphData(this.file.path);

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
		this.cy = cytoscape({
			container: this.graphContainerEl,
			style: [
				{
					selector: "node",
					style: {
						"background-color": "#ffffff",
						label: "data(label)",
						"text-valign": "center",
						"text-halign": "center",
						color: "#000000",
						"font-size": "14px",
						width: "100px",
						height: "50px",
						shape: "roundrectangle",
						"border-width": "1px",
						"border-color": "#cccccc",
						"text-wrap": "wrap",
						"text-max-width": "90px",
					},
				},
				{
					selector: "node[level = 0]",
					style: {
						"background-color": "#f0f0f0",
						"border-color": "#999999",
						"border-width": "2px",
						width: "130px",
						height: "60px",
						"font-weight": "bold",
						"font-size": "16px",
					},
				},
				{
					selector: "edge",
					style: {
						width: 1.5,
						"line-color": "#e0e0e0",
						"target-arrow-color": "#e0e0e0",
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
				{
					selector: "edge[type = 'parent']",
					style: {
						"line-color": "#d0d0d0",
						"target-arrow-color": "#d0d0d0",
					},
				},
				{
					selector: "edge[type = 'child']",
					style: {
						"line-color": "#d0d0d0",
						"target-arrow-color": "#d0d0d0",
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
				this.app.workspace.getLeaf(false).openFile(file);
			}
		});
	}

	private renderGraph(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
		if (!this.cy) return;

		this.cy.add([...nodes, ...edges]);

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

	private buildGraphData(rootPath: string): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const addedNodes = new Set<string>();
		const processedNodes = new Set<string>();

		const addNode = (pathOrWikiLink: string, level: number): void => {
			const filePath = extractFilePath(pathOrWikiLink);
			addedNodes.add(filePath);
			const displayName = extractDisplayName(pathOrWikiLink);

			nodes.push({
				data: {
					id: filePath,
					label: displayName,
					level: level,
				},
			});
		};

		const addRelationships = (filePath: string, currentLevel: number, maxDepth = 10): void => {
			// Prevent infinite recursion on circular relationships
			if (Math.abs(currentLevel) > maxDepth) return;
			if (processedNodes.has(filePath)) return;

			processedNodes.add(filePath);

			const context = getFileContext(this.app, filePath);
			if (!context.file || !context.frontmatter) return;

			const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

			for (const parentWikiLink of rels.allParents) {
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
		};

		addNode(rootPath, 0);
		addRelationships(rootPath, 0);

		return { nodes, edges };
	}
}
