import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import { ItemView, TFile } from "obsidian";
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
	private renderRelated = false;
	private includeAllRelated = false;
	private toggleCheckbox: HTMLInputElement | null = null;
	private relatedCheckbox: HTMLInputElement | null = null;
	private includeAllCheckbox: HTMLInputElement | null = null;
	private startFromCurrentContainer: HTMLElement | null = null;
	private includeAllContainer: HTMLElement | null = null;
	private indexer!: Indexer;

	setIndexer(indexer: Indexer): void {
		this.indexer = indexer;
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

		// Create "Render Related" toggle container
		const relatedToggleContainer = this.headerEl.createEl("div", { cls: "nexus-graph-toggle-container" });

		this.relatedCheckbox = relatedToggleContainer.createEl("input", { type: "checkbox" });
		this.relatedCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.relatedCheckbox.checked = this.renderRelated;

		relatedToggleContainer.createEl("label", {
			text: "Render Related",
			cls: "nexus-graph-toggle-label",
		});

		this.relatedCheckbox.addEventListener("change", () => {
			this.renderRelated = this.relatedCheckbox?.checked ?? false;
			this.updateToggleVisibility();
			this.updateGraph();
		});

		// Create "Include all related" toggle container (only visible in related mode)
		this.includeAllContainer = this.headerEl.createEl("div", { cls: "nexus-graph-toggle-container" });

		this.includeAllCheckbox = this.includeAllContainer.createEl("input", { type: "checkbox" });
		this.includeAllCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.includeAllCheckbox.checked = this.includeAllRelated;

		this.includeAllContainer.createEl("label", {
			text: "Include all related",
			cls: "nexus-graph-toggle-label",
		});

		this.includeAllCheckbox.addEventListener("change", () => {
			this.includeAllRelated = this.includeAllCheckbox?.checked ?? false;
			this.updateGraph();
		});

		// Create "Start from current file" toggle container
		this.startFromCurrentContainer = this.headerEl.createEl("div", { cls: "nexus-graph-toggle-container" });

		this.toggleCheckbox = this.startFromCurrentContainer.createEl("input", { type: "checkbox" });
		this.toggleCheckbox.addClass("nexus-graph-toggle-checkbox");
		this.toggleCheckbox.checked = this.ignoreTopmostParent;

		this.startFromCurrentContainer.createEl("label", {
			text: "Start from current file",
			cls: "nexus-graph-toggle-label",
		});

		this.toggleCheckbox.addEventListener("change", () => {
			this.ignoreTopmostParent = this.toggleCheckbox?.checked ?? false;
			this.updateGraph();
		});

		// Set initial visibility
		this.updateToggleVisibility();

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

		// Register event listener for metadata changes (frontmatter updates)
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				// Only re-render if the changed file is the currently displayed file
				if (this.currentFile && file.path === this.currentFile.path) {
					this.updateGraph();
				}
			})
		);

		setTimeout(() => {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) {
				this.onFileOpen(activeFile);
			}
		}, 100);
	}

	async onClose(): Promise<void> {
		this.destroyGraph();
		this.currentFile = null;
		this.headerEl = null;
		this.graphContainerEl = null;
		this.toggleCheckbox = null;
		this.relatedCheckbox = null;
		this.includeAllCheckbox = null;
		this.startFromCurrentContainer = null;
		this.includeAllContainer = null;
	}

	private updateToggleVisibility(): void {
		if (this.startFromCurrentContainer) {
			this.startFromCurrentContainer.style.display = this.renderRelated ? "none" : "flex";
		}
		if (this.includeAllContainer) {
			this.includeAllContainer.style.display = this.renderRelated ? "flex" : "none";
		}
	}

	private onFileOpen(file: TFile | null): void {
		if (!file) {
			this.showEmptyState("No file selected");
			return;
		}

		if (!this.indexer) {
			this.showEmptyState("Plugin is still initializing. Please wait...");
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

		// Rebuild graph based on mode
		const { nodes, edges } = this.renderRelated
			? this.buildRelatedGraphData(this.currentFile.path)
			: this.buildGraphData(this.currentFile.path);

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

		if (this.renderRelated) {
			// Use concentric layout for constellation/nebula pattern
			// Central star (source) in the middle, related nodes in outer orbit
			this.cy
				.layout({
					name: "concentric",
					fit: true,
					padding: 120,
					startAngle: (3 / 2) * Math.PI, // Start at top
					sweep: undefined, // Full circle
					clockwise: true,
					equidistant: true,
					minNodeSpacing: 100, // Prevent overlapping
					concentric: (node: any) => {
						// Source node gets highest concentric value (innermost)
						return node.data("isSource") ? 2 : 1;
					},
					levelWidth: () => {
						// All non-source nodes at same level
						return 1;
					},
					animate: true,
					animationDuration: 800,
					animationEasing: "ease-out-cubic",
				})
				.run();
		} else {
			// Use dagre top-down layout for hierarchy
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
	}

	private buildRelatedGraphData(sourcePath: string): { nodes: ElementDefinition[]; edges: ElementDefinition[] } {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const processedNodes = new Set<string>();

		const addNode = (pathOrWikiLink: string, isSource: boolean): void => {
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
					level: isSource ? 0 : 1,
					isSource: isSource,
					width: estimatedWidth,
					height: estimatedHeight,
				},
			});
		};

		// Add central node (current file)
		addNode(sourcePath, true);

		// Get relationships for current file
		const context = getFileContext(this.app, sourcePath);
		if (context.file && context.frontmatter) {
			const rels = this.indexer.extractRelationships(context.file, context.frontmatter);

			const allRelated = this.includeAllRelated
				? this.computeAllRelatedRecursively(sourcePath, rels.related)
				: [...rels.related];

			for (const relatedWikiLink of allRelated) {
				const relatedPath = extractFilePath(relatedWikiLink);

				if (!processedNodes.has(relatedPath)) {
					addNode(relatedWikiLink, false);

					edges.push({
						data: {
							source: sourcePath,
							target: relatedPath,
						},
					});
				}
			}
		}

		return { nodes, edges };
	}

	private computeAllRelatedRecursively(sourceFilePath: string, directRelated: string[]): string[] {
		const visited = new Set<string>([sourceFilePath]);
		const allRelated: string[] = [];

		const collectRelated = (relatedItems: string[]): void => {
			for (const relatedWikiLink of relatedItems) {
				const relatedPath = extractFilePath(relatedWikiLink);
				const relatedContext = getFileContext(this.app, relatedPath);

				if (visited.has(relatedContext.pathWithExt)) {
					continue;
				}

				visited.add(relatedContext.pathWithExt);
				allRelated.push(relatedWikiLink);

				if (!relatedContext.file || !relatedContext.frontmatter) {
					continue;
				}

				const nestedRels = this.indexer.extractRelationships(relatedContext.file, relatedContext.frontmatter);
				collectRelated(nestedRels.related);
			}
		};

		collectRelated(directRelated);
		return allRelated;
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
