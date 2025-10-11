import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { type App, Modal, Notice, TFile } from "obsidian";
import type { Indexer } from "../core/indexer";
import { getFileContext } from "../utils/file-context";
import { extractDisplayName, extractFilePath } from "../utils/file-name-extractor";

cytoscape.use(cytoscapeDagre);

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
						"background-color": "#2c3e50",
						label: "data(label)",
						"text-valign": "center",
						"text-halign": "center",
						color: "#ffffff",
						"font-size": "13px",
						"font-weight": "normal",
						"min-width": "80px",
						"min-height": "40px",
						width: "data(width)",
						height: "data(height)",
						shape: "roundrectangle",
						"border-width": "2px",
						"border-color": "#1a252f",
						"text-wrap": "wrap",
						"text-max-width": "100px",
						padding: "8px",
					},
				},
				{
					selector: "node[?isSource]",
					style: {
						"background-color": "#e67e22",
						"border-color": "#d35400",
						"border-width": "4px",
						"font-weight": "bold",
						"font-size": "14px",
					},
				},
				{
					selector: "edge",
					style: {
						width: 2.5,
						"line-color": "#7f8c8d",
						"target-arrow-color": "#7f8c8d",
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
						"arrow-scale": 1.5,
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
				name: "dagre",
				rankDir: "TB",
				align: undefined,
				nodeSep: 60,
				rankSep: 100,
				edgeSep: 40,
				ranker: "network-simplex",
				animate: true,
				animationDuration: 600,
				animationEasing: "ease-in-out",
				fit: true,
				padding: 60,
			} as any)
			.run();
	}

	private findTopmostParent(startPath: string, maxDepth = 50): string {
		const visited = new Set<string>();
		let topmostParent = startPath;
		let maxLevel = 0;

		const dfsUpwards = (filePath: string, currentLevel: number): void => {
			if (currentLevel > maxDepth || visited.has(filePath)) return;
			visited.add(filePath);

			if (currentLevel > maxLevel) {
				maxLevel = currentLevel;
				topmostParent = filePath;
			}

			const context = getFileContext(this.app, filePath);
			if (!context.file || !context.frontmatter) return;

			const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

			for (const parentWikiLink of rels.parent) {
				const parentPath = extractFilePath(parentWikiLink);

				if (!visited.has(parentPath)) {
					dfsUpwards(parentPath, currentLevel + 1);
				}
			}
		};

		dfsUpwards(startPath, 0);
		return topmostParent;
	}

	private buildGraphData(sourcePath: string): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		const rootPath = this.findTopmostParent(sourcePath);

		const addNode = (pathOrWikiLink: string, level: number, isSource: boolean): void => {
			const filePath = extractFilePath(pathOrWikiLink);
			if (processedNodes.has(filePath)) return;

			processedNodes.add(filePath);
			const displayName = extractDisplayName(pathOrWikiLink);

			const estimatedWidth = Math.max(80, Math.min(displayName.length * 8, 150));
			const estimatedHeight = 45;

			nodes.push({
				data: {
					id: filePath,
					label: displayName,
					level: level,
					isSource: isSource,
					width: estimatedWidth,
					height: estimatedHeight,
				},
			});
		};

		const buildDownwardsBFS = (): void => {
			const queue: Array<{ path: string; level: number }> = [{ path: rootPath, level: 0 }];
			addNode(rootPath, 0, rootPath === sourcePath);

			while (queue.length > 0) {
				const { path: currentPath, level: currentLevel } = queue.shift()!;

				if (currentLevel > 50) continue;

				const context = getFileContext(this.app, currentPath);
				if (!context.file || !context.frontmatter) continue;

				const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

				for (const childWikiLink of rels.children) {
					const childPath = extractFilePath(childWikiLink);

					if (!processedNodes.has(childPath)) {
						const isSource = childPath === sourcePath;
						addNode(childWikiLink, currentLevel + 1, isSource);

						edges.push({
							data: {
								source: currentPath,
								target: childPath,
							},
						});

						queue.push({ path: childPath, level: currentLevel + 1 });
					}
				}
			}
		};

		buildDownwardsBFS();

		return { nodes, edges };
	}
}
