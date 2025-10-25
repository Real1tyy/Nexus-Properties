import type cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import { CollisionDetector } from "./collision-detector";
import { ConstellationPositioner } from "./constellation-positioner";
import { NodeOrganizer } from "./node-organizer";

export interface LayoutConfig {
	animationDuration: number;
	isFolderNote: boolean;
	renderRelated: boolean;
	includeAllRelated: boolean;
}

export interface GraphLayoutManagerConfig {
	getCy: () => Core;
}

export class GraphLayoutManager {
	private readonly nodeOrganizer: NodeOrganizer;
	private readonly collisionDetector: CollisionDetector;

	constructor(private readonly config: GraphLayoutManagerConfig) {
		this.nodeOrganizer = new NodeOrganizer();
		this.collisionDetector = new CollisionDetector(60);
	}

	private get cy(): Core {
		return this.config.getCy();
	}

	applyLayout(nodes: ElementDefinition[], edges: ElementDefinition[], config: LayoutConfig): void {
		const { animationDuration, isFolderNote, renderRelated, includeAllRelated } = config;

		// Check layout mode flags
		const hasConstellationData = nodes.some((node) => node.data && typeof node.data.constellationIndex === "number");
		const hasConstellationGroups = nodes.some((node) => node.data && typeof node.data.constellationGroup === "number");

		if (isFolderNote && renderRelated && hasConstellationGroups) {
			this.applyFolderConstellationLayout(nodes, animationDuration);
		} else if (isFolderNote) {
			this.applyForestLayoutWithVerticalDistribution(nodes, edges, animationDuration);
		} else if (renderRelated && includeAllRelated && hasConstellationData) {
			this.applyRecursiveConstellationLayout(nodes, animationDuration);
		} else if (renderRelated) {
			this.applyConcentricLayout(animationDuration);
		} else {
			this.applyDagreLayout(animationDuration);
		}
	}

	private applyRecursiveConstellationLayout(nodes: ElementDefinition[], animationDuration: number): void {
		const positioner = new ConstellationPositioner(this.cy, {
			baseOrbitalRadius: 150,
			minNodeDistance: 60,
			radiusIncrement: 30,
		});

		const nodePositions = new Map<string, { x: number; y: number }>();
		positioner.positionRecursiveConstellation(nodes, 0, 0, nodePositions);

		this.applyPresetLayout(nodes, nodePositions, animationDuration, 120);
	}

	private applyFolderConstellationLayout(nodes: ElementDefinition[], animationDuration: number): void {
		const positioner = new ConstellationPositioner(this.cy, {
			baseOrbitalRadius: 180,
			minNodeDistance: 90,
		});

		const nodePositions = positioner.positionMultipleConstellations(nodes, 600, (groupNodes, centerX, centerY, pos) =>
			positioner.positionRecursiveConstellation(groupNodes, centerX, centerY, pos)
		);

		this.applyPresetLayout(nodes, nodePositions, animationDuration, 120);
	}

	private applyForestLayoutWithVerticalDistribution(
		nodes: ElementDefinition[],
		edges: ElementDefinition[],
		animationDuration: number
	): void {
		// First, apply dagre to get hierarchical structure
		const layout = this.cy.layout({
			name: "dagre",
			rankDir: "TB",
			nodeSep: 80,
			rankSep: 120,
			edgeSep: 50,
			ranker: "network-simplex",
			animate: false,
		} as any);

		layout.run();

		// Identify and organize trees
		const trees = this.nodeOrganizer.identifyConnectedComponents(nodes, edges);
		const { singleNodeTrees, multiNodeTrees } = this.nodeOrganizer.separateTreesBySize(trees);

		// Calculate and position multi-node trees
		const treeBounds = this.calculateTreeBounds(multiNodeTrees);
		const { maxX, maxHeight } = this.positionMultiNodeTrees(treeBounds);

		// Distribute single-node trees
		if (singleNodeTrees.length > 0) {
			this.distributeSingleNodesInGrid(singleNodeTrees, treeBounds, maxX, maxHeight);
		}

		// Apply final layout
		this.runLayoutWithAnimationHandling(
			() =>
				this.cy.layout({
					name: "preset",
					fit: true,
					padding: 100,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	private calculateTreeBounds(
		trees: string[][]
	): Array<{ tree: string[]; minX: number; maxX: number; minY: number; maxY: number }> {
		const treeBounds: Array<{ tree: string[]; minX: number; maxX: number; minY: number; maxY: number }> = [];

		trees.forEach((tree) => {
			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;

			tree.forEach((nodeId) => {
				const cyNode = this.cy.getElementById(nodeId);
				if (cyNode.length > 0) {
					const pos = cyNode.position();
					minX = Math.min(minX, pos.x);
					maxX = Math.max(maxX, pos.x);
					minY = Math.min(minY, pos.y);
					maxY = Math.max(maxY, pos.y);
				}
			});

			treeBounds.push({ tree, minX, maxX, minY, maxY });
		});

		return treeBounds.sort((a, b) => a.maxX - a.minX - (b.maxX - b.minX));
	}

	private positionMultiNodeTrees(
		treeBounds: Array<{ tree: string[]; minX: number; maxX: number; minY: number; maxY: number }>
	): { maxX: number; maxHeight: number } {
		const TREE_HORIZONTAL_SPACING = 150;
		const VERTICAL_STAGGER = 200;

		let currentX = 0;
		let maxCanvasHeight = 0;

		treeBounds.forEach((bounds, index) => {
			const { tree, minX, minY } = bounds;
			const treeHeight = bounds.maxY - minY;

			const verticalOffset = (index % 2) * VERTICAL_STAGGER;
			const translateX = currentX - minX;
			const translateY = verticalOffset - minY;

			tree.forEach((nodeId) => {
				const cyNode = this.cy.getElementById(nodeId);
				if (cyNode.length > 0) {
					const pos = cyNode.position();
					cyNode.position({
						x: pos.x + translateX,
						y: pos.y + translateY,
					});
				}
			});

			currentX += bounds.maxX - minX + TREE_HORIZONTAL_SPACING;
			maxCanvasHeight = Math.max(maxCanvasHeight, treeHeight + verticalOffset);
		});

		return { maxX: currentX, maxHeight: maxCanvasHeight };
	}

	private distributeSingleNodesInGrid(
		singleNodeTrees: string[][],
		treeBounds: Array<{ minX: number; maxX: number; minY: number; maxY: number }>,
		multiTreeEndX: number,
		maxMultiTreeHeight: number
	): void {
		const MIN_NODE_SPACING = 80;
		const PADDING = 50;

		const numNodes = singleNodeTrees.length;
		const aspectRatio = 1.5;
		const cols = Math.ceil(Math.sqrt(numNodes * aspectRatio));
		const rows = Math.ceil(numNodes / cols);

		const cellWidth = MIN_NODE_SPACING * 1.5;
		const cellHeight = MIN_NODE_SPACING * 1.5;
		const gridHeight = rows * cellHeight;
		const startX = multiTreeEndX + PADDING;
		const startY = PADDING;
		const availableHeight = Math.max(gridHeight, maxMultiTreeHeight);

		singleNodeTrees.forEach((tree, index) => {
			const col = index % cols;
			const row = Math.floor(index / cols);

			let x = startX + col * cellWidth;
			let y = startY + row * cellHeight;

			// Check for collision and adjust if needed
			if (this.collisionDetector.collidesWithBounds(x, y, treeBounds, MIN_NODE_SPACING)) {
				// Try horizontal shift
				for (let xOffset = 0; xOffset < 500; xOffset += cellWidth) {
					const testX = x + xOffset;
					if (!this.collisionDetector.collidesWithBounds(testX, y, treeBounds, MIN_NODE_SPACING)) {
						x = testX;
						break;
					}
				}

				// Try vertical shift if still colliding
				if (this.collisionDetector.collidesWithBounds(x, y, treeBounds, MIN_NODE_SPACING)) {
					for (let yOffset = 0; yOffset < availableHeight; yOffset += cellHeight) {
						const testY = startY + yOffset;
						if (!this.collisionDetector.collidesWithBounds(x, testY, treeBounds, MIN_NODE_SPACING)) {
							y = testY;
							break;
						}
					}
				}
			}

			const cyNode = this.cy.getElementById(tree[0]);
			if (cyNode.length > 0) {
				cyNode.position({ x, y });
			}
		});
	}

	private applyConcentricLayout(animationDuration: number): void {
		this.runLayoutWithAnimationHandling(
			() =>
				this.cy.layout({
					name: "concentric",
					fit: true,
					padding: 120,
					startAngle: (3 / 2) * Math.PI,
					sweep: undefined,
					clockwise: true,
					equidistant: true,
					minNodeSpacing: 100,
					concentric: (node: any) => (node.data("isSource") ? 2 : 1),
					levelWidth: () => 1,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	private applyDagreLayout(animationDuration: number): void {
		this.runLayoutWithAnimationHandling(
			() =>
				this.cy.layout({
					name: "dagre",
					rankDir: "TB",
					align: undefined,
					nodeSep: 80,
					rankSep: 120,
					edgeSep: 50,
					ranker: "network-simplex",
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
					fit: true,
					padding: 80,
				} as any),
			animationDuration
		);
	}

	private applyPresetLayout(
		nodes: ElementDefinition[],
		nodePositions: Map<string, { x: number; y: number }>,
		animationDuration: number,
		padding: number
	): void {
		nodes.forEach((node) => {
			if (!node.data?.id) return;

			const pos = nodePositions.get(node.data.id);
			if (!pos) return;

			const cyNode = this.cy.getElementById(node.data.id);
			if (cyNode.length > 0) {
				cyNode.position(pos);
			}
		});

		this.runLayoutWithAnimationHandling(
			() =>
				this.cy.layout({
					name: "preset",
					fit: true,
					padding: padding,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	/**
	 * Accepts layout factory function to avoid duplication of animation setup logic.
	 * Centers graph after animation completes or immediately if no animation.
	 */
	private runLayoutWithAnimationHandling(layoutFactory: () => cytoscape.Layouts, animationDuration: number): void {
		const layout = layoutFactory();

		// For animated layouts, center after animation completes
		if (animationDuration > 0) {
			this.cy.one("layoutstop", () => this.ensureCentered());
		}

		layout.run();

		// For instant layouts, center immediately
		if (animationDuration === 0) {
			setTimeout(() => {
				this.cy.resize();
				this.cy.fit();
				this.cy.center();
			}, 0);
		}
	}

	private ensureCentered(): void {
		try {
			this.cy.resize();
		} catch {
			// ignore
		}

		requestAnimationFrame(() => {
			this.cy.fit();
			this.cy.center();
		});
	}
}
