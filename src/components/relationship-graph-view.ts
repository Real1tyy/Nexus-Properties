import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { ItemView, TFile, type WorkspaceLeaf } from "obsidian";
import type { Indexer } from "../core/indexer";
import { getFileContext } from "../utils/file-context";
import { extractDisplayName, extractFilePath } from "../utils/file-name-extractor";

cytoscape.use(cytoscapeDagre);

export const VIEW_TYPE_RELATIONSHIP_GRAPH = "nexus-relationship-graph-view";

export class RelationshipGraphView extends ItemView {
	private cy: Core | null = null;
	private graphContainerEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;
	private currentFile: TFile | null = null;
	private ignoreTopmostParent = false;
	private toggleCheckbox: HTMLInputElement | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private indexer: Indexer
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_RELATIONSHIP_GRAPH;
	}

	getDisplayText(): string {
		return "Relationship Graph";
	}

	getIcon(): string {
		return "git-fork";
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("nexus-graph-view-content");

		// Create header with controls
		this.headerEl = contentEl.createEl("div", { cls: "nexus-graph-view-header" });

		const titleEl = this.headerEl.createEl("h4", { text: "No file selected" });
		titleEl.addClass("nexus-graph-view-title");

		// Create toggle container
		const toggleContainer = this.headerEl.createEl("div", { cls: "nexus-graph-toggle-container" });

		this.toggleCheckbox = toggleContainer.createEl("input", { type: "checkbox" });
		this.toggleCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.toggleCheckbox.checked = this.ignoreTopmostParent;

		toggleContainer.createEl("label", {
			text: "Start from current file",
			cls: "nexus-graph-toggle-label",
		});

		this.toggleCheckbox.addEventListener("change", () => {
			this.ignoreTopmostParent = this.toggleCheckbox?.checked ?? false;
			this.updateGraph();
		});

		// Create graph container
		this.graphContainerEl = contentEl.createEl("div", {
			cls: "nexus-graph-view-container",
		});

		// Register event listener for active file changes
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				this.onFileOpen(file);
			})
		);

		// Initialize with current active file
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			this.onFileOpen(activeFile);
		}
	}

	async onClose(): Promise<void> {
		this.destroyGraph();
		this.currentFile = null;
		this.headerEl = null;
		this.graphContainerEl = null;
		this.toggleCheckbox = null;
	}

	private onFileOpen(file: TFile | null): void {
		if (!file) {
			this.showEmptyState("No file selected");
			return;
		}

		if (!this.indexer.shouldIndexFile(file.path)) {
			this.showEmptyState("This file is not in a configured directory for relationship tracking.");
			return;
		}

		const { frontmatter } = this.app.metadataCache.getFileCache(file) ?? {};

		if (!frontmatter) {
			this.showEmptyState("This file has no frontmatter properties.");
			return;
		}

		this.currentFile = file;
		this.updateGraph();
	}

	private showEmptyState(message: string): void {
		this.currentFile = null;
		this.destroyGraph();

		if (this.headerEl) {
			const titleEl = this.headerEl.querySelector(".nexus-graph-view-title");
			if (titleEl) {
				titleEl.textContent = message;
			}
		}

		if (this.graphContainerEl) {
			this.graphContainerEl.empty();
			this.graphContainerEl.createEl("div", {
				text: message,
				cls: "nexus-graph-empty-state",
			});
		}
	}

	private updateGraph(): void {
		if (!this.currentFile) return;

		// Update header title
		if (this.headerEl) {
			const titleEl = this.headerEl.querySelector(".nexus-graph-view-title");
			if (titleEl) {
				titleEl.textContent = `Relationship Graph: ${this.currentFile.basename}`;
			}
		}

		// Rebuild graph
		const { nodes, edges } = this.buildGraphData(this.currentFile.path);

		this.destroyGraph();

		if (this.graphContainerEl) {
			this.graphContainerEl.empty();
		}

		this.initializeCytoscape();
		this.renderGraph(nodes, edges);
	}

	private destroyGraph(): void {
		if (this.cy) {
			this.cy.destroy();
			this.cy = null;
		}
	}

	private initializeCytoscape(): void {
		this.cy = cytoscape({
			container: this.graphContainerEl,
			minZoom: 0.3,
			maxZoom: 3,
			wheelSensitivity: 0.7,
			style: [
				// Base constellation "star" nodes
				{
					selector: "node",
					style: {
						width: 16,
						height: 16,
						"background-color": "#e9f2ff",
						"border-width": 2,
						"border-color": "#ffffff",
						"border-opacity": 0.8,
						shape: "ellipse",
						label: "data(label)",
						"font-size": 11,
						color: "#d4e4ff",
						"text-margin-y": -18,
						"text-outline-color": "#000",
						"text-outline-width": 2.5,
						"text-halign": "center",
						"text-valign": "top",
						"text-wrap": "wrap",
						"text-max-width": "120px",
						"overlay-color": "#7ad1ff",
						"overlay-opacity": 0.15,
						"overlay-padding": 12,
						"transition-property": "overlay-opacity, overlay-padding, width, height",
						"transition-duration": 300,
						"transition-timing-function": "ease-out",
					},
				},
				// Source node (central star) - larger and brighter
				{
					selector: "node[?isSource]",
					style: {
						width: 24,
						height: 24,
						"background-color": "#ffd89b",
						"border-color": "#fff",
						"border-width": 3,
						"font-weight": "bold",
						"font-size": 13,
						color: "#ffeaa7",
						"overlay-color": "#ffd89b",
						"overlay-opacity": 0.35,
						"overlay-padding": 20,
					},
				},
				// Root/parent nodes - medium importance
				{
					selector: "node[level = 0]",
					style: {
						width: 20,
						height: 20,
						"background-color": "#a8daff",
						"overlay-padding": 16,
					},
				},
				// Glow effect for special nodes
				{
					selector: "node.glow",
					style: {
						"overlay-opacity": 0.28,
					},
				},
				// Dimmed nodes (during hover)
				{
					selector: "node.dim",
					style: {
						opacity: 0.25,
					},
				},
				// Edge glow underlay (wide, translucent)
				{
					selector: "edge",
					style: {
						width: 4,
						"line-color": "rgba(120, 180, 255, 0.12)",
						"curve-style": "unbundled-bezier",
						"control-point-distances": [30, -30],
						"control-point-weights": [0.3, 0.7],
						"target-arrow-shape": "none",
						opacity: 0.8,
					},
				},
				// Edge core line (thin, bright)
				{
					selector: "edge.core",
					style: {
						width: 1.5,
						"line-color": "#a7c8ff",
						opacity: 0.9,
					},
				},
				// Highlighted path
				{
					selector: "edge.highlighted",
					style: {
						width: 2.5,
						"line-color": "#ffffff",
						opacity: 1,
						"transition-property": "line-color, width, opacity",
						"transition-duration": 250,
					},
				},
				// Dimmed edges
				{
					selector: "edge.dim",
					style: {
						opacity: 0.15,
					},
				},
			],
			layout: {
				name: "grid",
			},
		});

		// Add all edges to core class for layered rendering
		this.cy.edges().addClass("core");

		// Add sparkle animation to random nodes
		this.addSparkleAnimations();

		// Interactive hover effects
		this.cy.on("mouseover", "node", (evt) => {
			if (!this.cy) return;
			const node = evt.target;
			this.cy.elements().removeClass("dim");
			this.cy.elements().not(node.closedNeighborhood()).addClass("dim");
			node.closedNeighborhood("edge").addClass("highlighted");
		});

		this.cy.on("mouseout", "node", () => {
			if (!this.cy) return;
			this.cy.elements().removeClass("dim highlighted");
		});

		// Click handler to open files
		this.cy.on("tap", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const file = this.app.vault.getAbstractFileByPath(filePath);

			if (file instanceof TFile) {
				this.app.workspace.getLeaf(false).openFile(file);
			}
		});
	}

	private addSparkleAnimations(): void {
		if (!this.cy) return;

		this.cy.nodes().forEach((node) => {
			if (Math.random() < 0.4) {
				node.addClass("glow");
				const pulse = (): void => {
					node.animate({ style: { "overlay-opacity": 0.35 } }, { duration: 1500, easing: "ease-in-out" }).animate(
						{ style: { "overlay-opacity": 0.12 } },
						{
							duration: 1500,
							easing: "ease-in-out",
							complete: pulse,
						}
					);
				};
				// Stagger animation start
				setTimeout(() => pulse(), Math.random() * 1000);
			}
		});
	}

	private renderGraph(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
		if (!this.cy) return;

		this.cy.add([...nodes, ...edges]);

		// Use dagre top-down layout with constellation styling
		this.cy
			.layout({
				name: "dagre",
				rankDir: "TB", // Top to bottom hierarchy
				align: undefined,
				nodeSep: 80, // Horizontal spacing between nodes
				rankSep: 120, // Vertical spacing between levels
				edgeSep: 50, // Spacing between edges
				ranker: "network-simplex",
				animate: true,
				animationDuration: 800,
				animationEasing: "ease-out-cubic",
				fit: true,
				padding: 80,
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

		const rootPath = this.ignoreTopmostParent ? sourcePath : this.findTopmostParent(sourcePath);

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
