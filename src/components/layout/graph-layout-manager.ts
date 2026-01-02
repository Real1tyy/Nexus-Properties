import type cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import { CollisionDetector } from "./collision-detector";
import { ConstellationPositioner } from "./constellation-positioner";
import { type Bounds, NodeOrganizer, type TreeBounds } from "./node-organizer";

interface LayoutConfig {
	animationDuration: number;
	isFolderNote: boolean;
	renderRelated: boolean;
	includeAllRelated: boolean;
	useMultiRowLayout?: boolean;
	maxChildrenPerRow?: number;
}

interface GraphLayoutManagerConfig {
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
		const { animationDuration, isFolderNote, renderRelated, includeAllRelated, useMultiRowLayout, maxChildrenPerRow } =
			config;

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
			this.applyDagreLayout(animationDuration, useMultiRowLayout, maxChildrenPerRow, nodes, edges);
		}
		this.distributeIsolatedNodes(nodes, edges, animationDuration);
	}

	/**
	 * Detects isolated single nodes (nodes with no edges) and distributes them
	 * in a grid pattern to prevent overlapping. This is especially important
	 * after filtering when previously connected nodes become isolated.
	 */
	private distributeIsolatedNodes(
		nodes: ElementDefinition[],
		edges: ElementDefinition[],
		animationDuration: number
	): void {
		const trees = this.nodeOrganizer.identifyConnectedComponents(nodes, edges);
		const { singleNodeTrees } = this.nodeOrganizer.separateTreesBySize(trees);

		if (!this.nodeOrganizer.hasOverlappingIsolatedNodes(this.cy, singleNodeTrees)) {
			return;
		}

		const singleNodeIds = new Set(singleNodeTrees.flat());
		const connectedNodeIds = nodes.map((n) => n.data?.id as string).filter((id) => !singleNodeIds.has(id));
		const connectedBounds = this.nodeOrganizer.calculateBounds(this.cy, connectedNodeIds);

		const newPositions = this.nodeOrganizer.calculateIsolatedNodeGridPositions(singleNodeTrees, connectedBounds, {
			minNodeSpacing: 80,
			padding: 100,
			aspectRatio: 1.5,
		});

		this.applyNodePositions(newPositions, animationDuration, 100);
	}

	private applyNodePositions(
		positions: Map<string, { x: number; y: number }>,
		animationDuration: number,
		padding: number
	): void {
		positions.forEach((pos, nodeId) => {
			const cyNode = this.cy.getElementById(nodeId);
			if (cyNode.length > 0) {
				if (animationDuration > 0) {
					cyNode.animate({
						position: pos,
						duration: animationDuration,
						easing: "ease-out-cubic",
					});
				} else {
					cyNode.position(pos);
				}
			}
		});

		// After positioning, refit the viewport to show everything
		if (animationDuration > 0) {
			setTimeout(() => {
				this.cy.fit(undefined, padding);
			}, animationDuration);
		} else {
			this.cy.fit(undefined, padding);
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

	private calculateTreeBounds(trees: string[][]): TreeBounds[] {
		const treeBounds: TreeBounds[] = [];

		trees.forEach((tree) => {
			const bounds = this.nodeOrganizer.calculateBounds(this.cy, tree);
			if (bounds) {
				treeBounds.push({ tree, ...bounds });
			}
		});

		return treeBounds.sort((a, b) => a.maxX - a.minX - (b.maxX - b.minX));
	}

	private positionMultiNodeTrees(treeBounds: TreeBounds[]): { maxX: number; maxHeight: number } {
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
		treeBounds: Bounds[],
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

	private applyDagreLayout(
		animationDuration: number,
		useMultiRowLayout?: boolean,
		maxChildrenPerRow?: number,
		nodes?: ElementDefinition[],
		edges?: ElementDefinition[]
	): void {
		// First apply standard dagre layout
		const layout = this.cy.layout({
			name: "dagre",
			rankDir: "TB",
			align: undefined,
			nodeSep: 80,
			rankSep: 120,
			edgeSep: 50,
			ranker: "network-simplex",
			animate: false, // We'll handle animation separately
			fit: false,
			padding: 80,
		} as any);

		layout.run();

		if (useMultiRowLayout && maxChildrenPerRow && nodes && edges) {
			this.applyMultiRowChildLayout(nodes, edges, maxChildrenPerRow);
		}

		this.runLayoutWithAnimationHandling(
			() =>
				this.cy.layout({
					name: "preset",
					fit: true,
					padding: 80,
					animate: animationDuration > 0,
					animationDuration: animationDuration,
					animationEasing: "ease-out-cubic",
				}),
			animationDuration
		);
	}

	/**
	 * Apply multi-row layout to children of parents with many children.
	 * Distributes children in staggered rows (maxPerRow, maxPerRow-1, maxPerRow, maxPerRow-1...)
	 * to use more vertical space and less horizontal space.
	 */
	private applyMultiRowChildLayout(
		nodes: ElementDefinition[],
		edges: ElementDefinition[],
		maxChildrenPerRow: number
	): void {
		const HORIZONTAL_SPACING = 120;
		const ROW_VERTICAL_SPACING = 140;
		const GENERATION_GAP = 160;
		const GROUP_HORIZONTAL_GAP = 180;

		// Build parent-child relationships (hierarchy edges only)
		const parentToChildren = new Map<string, string[]>();

		edges.forEach((edge) => {
			const source = edge.data?.source as string;
			const target = edge.data?.target as string;

			if (!parentToChildren.has(source)) {
				parentToChildren.set(source, []);
			}
			parentToChildren.get(source)!.push(target);
		});

		// Group nodes by level
		const nodesByLevel = new Map<number, ElementDefinition[]>();
		nodes.forEach((node) => {
			const level = (node.data?.level as number) ?? 0;
			if (!nodesByLevel.has(level)) {
				nodesByLevel.set(level, []);
			}
			nodesByLevel.get(level)!.push(node);
		});

		const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
		if (levels.length === 0) return;

		const maxLevel = Math.max(...levels);

		const getNodeIdsAtLevel = (level: number): string[] =>
			(nodesByLevel.get(level) ?? []).map((n) => n.data?.id as string).filter(Boolean);

		const getMaxYForIds = (ids: string[]): number => {
			let maxY = -Infinity;
			for (const id of ids) {
				const cyNode = this.cy.getElementById(id);
				if (cyNode.length === 0) continue;
				maxY = Math.max(maxY, cyNode.position().y);
			}
			return maxY;
		};

		const generationStartY = new Map<number, number>();
		const generationBottomY = new Map<number, number>();

		// Keep level 0 as-is, but we still need its bounds for the next generation baseline
		const level0Ids = getNodeIdsAtLevel(0);
		generationBottomY.set(0, getMaxYForIds(level0Ids));

		// Process generations top-down.
		// Key rule: each generation starts below the *bottom row* of the previous generation,
		// so grandchildren can never end up above parents that were pushed down into later rows.
		for (let level = 0; level < maxLevel; level++) {
			const parentIds = getNodeIdsAtLevel(level);
			if (parentIds.length === 0) continue;

			// Recompute bottom Y for this generation from current positions (may have been re-laid out)
			const currentGenerationBottom = getMaxYForIds(parentIds);
			generationBottomY.set(level, currentGenerationBottom);

			const childLevel = level + 1;
			const baselineY = currentGenerationBottom + GENERATION_GAP;
			generationStartY.set(childLevel, baselineY);

			// Position all children of this generation, but keep branches separated.
			// Strategy:
			// - Compute a "child group" per parent (all its direct children).
			// - Estimate required width for the group (based on max children in a row).
			// - Sweep left-to-right by desired parent X and shift groups so they don't overlap.
			// - Place children for each parent around the group's final center X using the domino layout.
			const groups = parentIds
				.map((parentId) => {
					const parentCy = this.cy.getElementById(parentId);
					if (parentCy.length === 0) return null;

					const children = parentToChildren.get(parentId) ?? [];
					if (children.length === 0) return null;

					const desiredCenterX = parentCy.position().x;
					const widestRowCount = Math.min(children.length, maxChildrenPerRow);
					const estimatedWidth = widestRowCount <= 1 ? 0 : (widestRowCount - 1) * HORIZONTAL_SPACING;

					return {
						parentId,
						children,
						desiredCenterX,
						estimatedWidth,
					};
				})
				.filter((g): g is NonNullable<typeof g> => Boolean(g))
				.sort((a, b) => a.desiredCenterX - b.desiredCenterX);

			const groupCenterXByParent = new Map<string, number>();
			let prevMaxX = -Infinity;
			for (const group of groups) {
				const halfWidth = group.estimatedWidth / 2;
				let centerX = group.desiredCenterX;
				let minX = centerX - halfWidth;
				let maxX = centerX + halfWidth;

				if (prevMaxX !== -Infinity && minX < prevMaxX + GROUP_HORIZONTAL_GAP) {
					const shift = prevMaxX + GROUP_HORIZONTAL_GAP - minX;
					centerX += shift;
					minX += shift;
					maxX += shift;
				}

				groupCenterXByParent.set(group.parentId, centerX);
				prevMaxX = Math.max(prevMaxX, maxX);
			}

			for (const group of groups) {
				const centerX = groupCenterXByParent.get(group.parentId) ?? group.desiredCenterX;
				const childPositions = this.calculateStaggeredChildPositions(group.children, centerX, baselineY, {
					maxPerRow: maxChildrenPerRow,
					horizontalSpacing: HORIZONTAL_SPACING,
					rowVerticalSpacing: ROW_VERTICAL_SPACING,
				});

				childPositions.forEach((pos, childId) => {
					const childCy = this.cy.getElementById(childId);
					if (childCy.length > 0) {
						childCy.position(pos);
					}
				});
			}

			// Update bounds for the child generation based on new positions.
			const childIds = getNodeIdsAtLevel(childLevel);
			if (childIds.length > 0) {
				generationBottomY.set(childLevel, getMaxYForIds(childIds));

				// For nodes that are at this level but weren't direct children of any processed parent,
				// ensure they don't float above the generation baseline (push down only if needed).
				const startY = generationStartY.get(childLevel);
				if (startY !== undefined) {
					for (const nodeId of childIds) {
						const cyNode = this.cy.getElementById(nodeId);
						if (cyNode.length === 0) continue;
						const pos = cyNode.position();
						if (pos.y < startY) {
							cyNode.position({ x: pos.x, y: startY });
						}
					}
					// Recompute after adjustments
					generationBottomY.set(childLevel, getMaxYForIds(childIds));
				}
			}
		}
	}

	/**
	 * Calculate staggered row positions for children.
	 * Pattern: maxPerRow in first row, maxPerRow-1 in second row (offset), maxPerRow in third row, etc.
	 */
	private calculateStaggeredChildPositions(
		children: string[],
		parentCenterX: number,
		baselineY: number,
		options: { maxPerRow: number; horizontalSpacing: number; rowVerticalSpacing: number }
	): Map<string, { x: number; y: number }> {
		const positions = new Map<string, { x: number; y: number }>();
		const { maxPerRow, horizontalSpacing, rowVerticalSpacing } = options;

		let childIndex = 0;
		let rowIndex = 0;

		while (childIndex < children.length) {
			// Alternate between maxPerRow and maxPerRow-1
			const isEvenRow = rowIndex % 2 === 0;
			const nodesInThisRow = isEvenRow ? maxPerRow : Math.max(1, maxPerRow - 1);
			const actualNodesInRow = Math.min(nodesInThisRow, children.length - childIndex);

			// Calculate row width and starting X
			const rowWidth = (actualNodesInRow - 1) * horizontalSpacing;
			const startX = parentCenterX - rowWidth / 2;

			// Add offset for odd rows (staggered effect)
			const xOffset = isEvenRow ? 0 : horizontalSpacing / 2;

			// Position nodes in this row
			for (let i = 0; i < actualNodesInRow; i++) {
				const childId = children[childIndex];
				const x = startX + i * horizontalSpacing + xOffset;
				const y = baselineY + rowIndex * rowVerticalSpacing;

				positions.set(childId, { x, y });
				childIndex++;
			}

			rowIndex++;
		}

		return positions;
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
