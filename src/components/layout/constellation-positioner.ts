import type { Core, ElementDefinition } from "cytoscape";
import { CollisionDetector } from "./collision-detector";
import { NodeOrganizer } from "./node-organizer";

export interface ConstellationConfig {
	baseOrbitalRadius: number;
	minNodeDistance: number;
	radiusIncrement?: number;
}

export class ConstellationPositioner {
	private readonly collisionDetector: CollisionDetector;
	private readonly nodeOrganizer: NodeOrganizer;

	constructor(
		private readonly cy: Core,
		private readonly config: ConstellationConfig
	) {
		this.collisionDetector = new CollisionDetector(config.minNodeDistance);
		this.nodeOrganizer = new NodeOrganizer();
	}

	positionRecursiveConstellation(
		nodes: ElementDefinition[],
		groupCenterX: number,
		groupCenterY: number,
		nodePositions: Map<string, { x: number; y: number }>
	): void {
		const { nodesByLevel, maxLevel } = this.nodeOrganizer.groupByLevel(nodes);

		// Position nodes level by level
		for (let level = 0; level <= maxLevel; level++) {
			const levelNodes = nodesByLevel.get(level) ?? [];

			levelNodes.forEach((node) => {
				if (!node.data?.id) return;

				// Root node at group center
				if (level === 0) {
					nodePositions.set(node.data.id, { x: groupCenterX, y: groupCenterY });
					return;
				}

				this.positionOrbitalNode(node, nodes, nodePositions);
			});
		}

		this.applyPositions(nodes, nodePositions);
	}

	private positionOrbitalNode(
		node: ElementDefinition,
		allNodes: ElementDefinition[],
		nodePositions: Map<string, { x: number; y: number }>
	): void {
		const centerPath = node.data?.centerPath;
		if (!centerPath) return;

		const orbitalIndex = node.data?.orbitalIndex ?? 0;
		const orbitalCount = node.data?.orbitalCount ?? 1;

		const centerPos = nodePositions.get(centerPath);
		if (!centerPos) return;

		const orbitalRadius = this.calculateOrbitalRadius(orbitalCount);
		const baseAngle = this.calculateBaseAngle(node.data?.centerPath, allNodes);
		const idealAngle = (orbitalIndex / orbitalCount) * 2 * Math.PI + baseAngle;

		const position = this.collisionDetector.findValidPositionSimple(
			centerPos.x,
			centerPos.y,
			orbitalRadius,
			idealAngle,
			(x, y) => this.collisionDetector.hasCollision(x, y, nodePositions)
		);

		nodePositions.set(node.data.id!, position);
	}

	/**
	 * Increases radius for larger orbital counts to prevent overlap.
	 */
	private calculateOrbitalRadius(orbitalCount: number): number {
		return this.config.baseOrbitalRadius + Math.max(0, (orbitalCount - 5) * 15);
	}

	/**
	 * Varies starting angle based on parent's orbital position to stagger sibling constellations.
	 */
	private calculateBaseAngle(centerPath: string, allNodes: ElementDefinition[]): number {
		let angleOffset = Math.PI / 2; // Default: start at top

		// If the center itself has an orbital index, use that to vary the starting angle
		const centerNode = allNodes.find((n) => n.data?.id === centerPath);
		if (centerNode?.data?.orbitalIndex !== undefined) {
			angleOffset += (centerNode.data.orbitalIndex * Math.PI) / 3;
		}

		return angleOffset;
	}

	private applyPositions(nodes: ElementDefinition[], nodePositions: Map<string, { x: number; y: number }>): void {
		nodes.forEach((node) => {
			if (!node.data?.id) return;

			const pos = nodePositions.get(node.data.id);
			if (!pos) return;

			const cyNode = this.cy.getElementById(node.data.id);
			if (cyNode.length > 0) {
				cyNode.position(pos);
			}
		});
	}

	positionMultipleConstellations(
		nodes: ElementDefinition[],
		constellationSpacing: number,
		positionStrategy: (
			groupNodes: ElementDefinition[],
			centerX: number,
			centerY: number,
			positions: Map<string, { x: number; y: number }>
		) => void
	): Map<string, { x: number; y: number }> {
		const nodesByGroup = this.nodeOrganizer.groupByConstellationGroup(nodes);
		const groups = Array.from(nodesByGroup.entries()).sort((a, b) => a[0] - b[0]);

		const groupsPerRow = Math.ceil(Math.sqrt(groups.length));
		const nodePositions = new Map<string, { x: number; y: number }>();

		groups.forEach(([_groupIndex, groupNodes], arrayIndex) => {
			const gridRow = Math.floor(arrayIndex / groupsPerRow);
			const gridCol = arrayIndex % groupsPerRow;
			const groupCenterX = gridCol * constellationSpacing;
			const groupCenterY = gridRow * constellationSpacing;

			positionStrategy(groupNodes, groupCenterX, groupCenterY, nodePositions);
		});

		this.applyPositions(nodes, nodePositions);
		return nodePositions;
	}
}
