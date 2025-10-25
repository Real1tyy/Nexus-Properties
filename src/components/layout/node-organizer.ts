import type { Core, ElementDefinition } from "cytoscape";

export interface Bounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export interface TreeBounds extends Bounds {
	tree: string[];
}

export class NodeOrganizer {
	groupByLevel(nodes: ElementDefinition[]): {
		nodesByLevel: Map<number, ElementDefinition[]>;
		maxLevel: number;
	} {
		const nodesByLevel = new Map<number, ElementDefinition[]>();
		let maxLevel = 0;

		nodes.forEach((node) => {
			const level = node.data?.constellationLevel ?? 0;
			if (!nodesByLevel.has(level)) {
				nodesByLevel.set(level, []);
			}
			nodesByLevel.get(level)!.push(node);
			maxLevel = Math.max(maxLevel, level);
		});

		return { nodesByLevel, maxLevel };
	}

	groupByConstellationGroup(nodes: ElementDefinition[]): Map<number, ElementDefinition[]> {
		const nodesByGroup = new Map<number, ElementDefinition[]>();

		nodes.forEach((node) => {
			const group = node.data?.constellationGroup as number;
			if (group === undefined) return;

			if (!nodesByGroup.has(group)) {
				nodesByGroup.set(group, []);
			}
			nodesByGroup.get(group)!.push(node);
		});

		return nodesByGroup;
	}

	identifyConnectedComponents(nodes: ElementDefinition[], edges: ElementDefinition[]): string[][] {
		const nodeIds = new Set(nodes.map((n) => n.data?.id as string));
		const adjacency = new Map<string, Set<string>>();

		// Build adjacency list (undirected)
		nodeIds.forEach((id) => {
			adjacency.set(id, new Set());
		});
		edges.forEach((edge) => {
			const source = edge.data?.source as string;
			const target = edge.data?.target as string;
			adjacency.get(source)?.add(target);
			adjacency.get(target)?.add(source);
		});

		// Find connected components using BFS
		const visited = new Set<string>();
		const components: string[][] = [];

		nodeIds.forEach((startNode) => {
			if (visited.has(startNode)) return;

			const component: string[] = [];
			const queue = [startNode];
			visited.add(startNode);

			while (queue.length > 0) {
				const node = queue.shift()!;
				component.push(node);

				adjacency.get(node)?.forEach((neighbor) => {
					if (!visited.has(neighbor)) {
						visited.add(neighbor);
						queue.push(neighbor);
					}
				});
			}

			components.push(component);
		});

		return components;
	}

	separateTreesBySize(trees: string[][]): {
		singleNodeTrees: string[][];
		multiNodeTrees: string[][];
	} {
		const singleNodeTrees: string[][] = [];
		const multiNodeTrees: string[][] = [];

		trees.forEach((tree) => {
			if (tree.length === 1) {
				singleNodeTrees.push(tree);
			} else {
				multiNodeTrees.push(tree);
			}
		});

		return { singleNodeTrees, multiNodeTrees };
	}

	/**
	 * Calculate the bounding box of specified nodes.
	 */
	calculateBounds(cy: Core, nodeIds: string[]): Bounds | null {
		if (nodeIds.length === 0) {
			return null;
		}

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;

		nodeIds.forEach((nodeId) => {
			const cyNode = cy.getElementById(nodeId);
			if (cyNode.length > 0) {
				const pos = cyNode.position();
				minX = Math.min(minX, pos.x);
				maxX = Math.max(maxX, pos.x);
				minY = Math.min(minY, pos.y);
				maxY = Math.max(maxY, pos.y);
			}
		});

		return { minX, maxX, minY, maxY };
	}

	/**
	 * Check if isolated single nodes have overlapping positions.
	 * Returns true if redistribution is needed.
	 */
	hasOverlappingIsolatedNodes(cy: Core, singleNodeTrees: string[][], minDistance = 30): boolean {
		const positions = new Map<string, { x: number; y: number }>();

		for (const tree of singleNodeTrees) {
			const cyNode = cy.getElementById(tree[0]);
			if (cyNode.length > 0) {
				const pos = cyNode.position();

				// Check if this position is too close to any existing position
				for (const existingPos of positions.values()) {
					const distance = Math.sqrt((pos.x - existingPos.x) ** 2 + (pos.y - existingPos.y) ** 2);
					if (distance < minDistance) {
						return true;
					}
				}

				positions.set(tree[0], pos);
			}
		}

		return false;
	}

	/**
	 * Calculate grid positions for isolated nodes.
	 * Returns a map of node IDs to their new positions.
	 */
	calculateIsolatedNodeGridPositions(
		singleNodeTrees: string[][],
		connectedBounds: Bounds | null,
		options: {
			minNodeSpacing?: number;
			padding?: number;
			aspectRatio?: number;
		} = {}
	): Map<string, { x: number; y: number }> {
		const { minNodeSpacing = 80, padding = 100, aspectRatio = 1.5 } = options;

		const positions = new Map<string, { x: number; y: number }>();
		const numNodes = singleNodeTrees.length;
		const cols = Math.ceil(Math.sqrt(numNodes * aspectRatio));

		const cellWidth = minNodeSpacing * 1.5;
		const cellHeight = minNodeSpacing * 1.5;

		// Position grid to the right of connected nodes, or at origin if no connected nodes
		const startX = connectedBounds ? connectedBounds.maxX + padding : padding;
		const startY = connectedBounds ? connectedBounds.minY : padding;

		singleNodeTrees.forEach((tree, index) => {
			const col = index % cols;
			const row = Math.floor(index / cols);

			const x = startX + col * cellWidth;
			const y = startY + row * cellHeight;

			positions.set(tree[0], { x, y });
		});

		return positions;
	}
}
