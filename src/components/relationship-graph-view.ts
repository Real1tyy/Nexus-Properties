import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { type App, Modal, Notice, TFile } from "obsidian";
import type { Indexer } from "../core/indexer";

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

		// Get file metadata
		const cache = this.app.metadataCache.getFileCache(this.file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) {
			new Notice("This file has no frontmatter properties.");
			this.close();
			return;
		}

		// Extract relationships
		const relationships = this.indexer.extractRelationships(this.file, frontmatter);

		// Build graph data
		const { nodes, edges } = this.buildGraphData(this.file.path, relationships);

		if (nodes.length === 0) {
			new Notice("This file has no relationships to display.");
			this.close();
			return;
		}

		// Set modal to full-width and full-height
		this.modalEl.addClass("nexus-graph-modal");
		contentEl.addClass("nexus-graph-modal-content");

		// Create header with close button
		const header = contentEl.createEl("div", { cls: "nexus-graph-modal-header" });
		header.createEl("h2", { text: `Relationship Graph: ${this.file.basename}` });

		const closeButton = header.createEl("button", {
			cls: "nexus-graph-close-button",
			text: "×",
		});
		closeButton.addEventListener("click", () => this.close());

		// Create graph container
		this.graphContainerEl = contentEl.createEl("div", {
			cls: "nexus-graph-modal-container",
		});

		// Initialize cytoscape
		this.initializeCytoscape();

		// Render the graph
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

		this.cy = cytoscape({
			container: this.graphContainerEl,
			style: [
				{
					selector: "node",
					style: {
						"background-color": "var(--interactive-accent)",
						label: "data(label)",
						"text-valign": "center",
						"text-halign": "center",
						color: "var(--text-normal)",
						"font-size": "14px",
						width: "100px",
						height: "50px",
						shape: "roundrectangle",
						"border-width": "2px",
						"border-color": "var(--background-modifier-border)",
						"text-wrap": "wrap",
						"text-max-width": "90px",
					},
				},
				{
					selector: "node[level = 0]",
					style: {
						"background-color": "var(--interactive-accent-hover)",
						"border-color": "var(--interactive-accent)",
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
						"line-color": "var(--background-modifier-border)",
						"target-arrow-color": "var(--background-modifier-border)",
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
				{
					selector: "edge[type = 'parent']",
					style: {
						"line-color": "var(--color-red)",
						"target-arrow-color": "var(--color-red)",
					},
				},
				{
					selector: "edge[type = 'child']",
					style: {
						"line-color": "var(--color-green)",
						"target-arrow-color": "var(--color-green)",
					},
				},
				{
					selector: "edge[type = 'related']",
					style: {
						"line-color": "var(--color-blue)",
						"target-arrow-color": "var(--color-blue)",
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
		_relationships: ReturnType<Indexer["extractRelationships"]>
	): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const visited = new Set<string>();

		// Helper function to get file name from path
		const getFileName = (path: string): string => {
			const name = path.split("/").pop() || path;
			return name.replace(/\.md$/, "");
		};

		// Helper function to add a node
		const addNode = (path: string, level: number): void => {
			if (visited.has(path)) return;
			visited.add(path);

			nodes.push({
				data: {
					id: path,
					label: getFileName(path),
					level: level,
				},
			});
		};

		// Helper function to recursively add relationships
		const addRelationships = (path: string, currentLevel: number, maxDepth = 3): void => {
			if (currentLevel > maxDepth) return;

			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) return;

			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter;
			if (!frontmatter) return;

			const rels = this.indexer.extractRelationships(file, frontmatter);

			// Add parents (going up in hierarchy)
			for (const parentPath of rels.allParents) {
				if (!parentPath) continue;
				const fullPath = parentPath.endsWith(".md") ? parentPath : `${parentPath}.md`;

				addNode(fullPath, currentLevel - 1);
				edges.push({
					data: {
						source: fullPath,
						target: path,
						type: "parent",
					},
				});

				// Recursively add parent's relationships
				addRelationships(fullPath, currentLevel - 1, maxDepth);
			}

			// Add children (going down in hierarchy)
			for (const childPath of rels.allChildren) {
				if (!childPath) continue;
				const fullPath = childPath.endsWith(".md") ? childPath : `${childPath}.md`;

				addNode(fullPath, currentLevel + 1);
				edges.push({
					data: {
						source: path,
						target: fullPath,
						type: "child",
					},
				});

				// Recursively add child's relationships
				addRelationships(fullPath, currentLevel + 1, maxDepth);
			}

			// Add related (same level)
			for (const relatedPath of rels.allRelated) {
				if (!relatedPath) continue;
				const fullPath = relatedPath.endsWith(".md") ? relatedPath : `${relatedPath}.md`;

				addNode(fullPath, currentLevel);
				edges.push({
					data: {
						source: path,
						target: fullPath,
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
