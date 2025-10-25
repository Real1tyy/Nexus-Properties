import type { ElementDefinition } from "cytoscape";

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
}
