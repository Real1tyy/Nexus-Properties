import type { Core } from "cytoscape";
import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { EdgeContextMenu } from "./edge-context-menu";
import type { NodeContextMenu } from "./node-context-menu";
import type { PropertyTooltip } from "./property-tooltip";
import type { RelationshipAdder } from "./relationship-adder";

export interface GraphInteractionConfig {
	getCy: () => Core;
	viewType: string;
	getCurrentFile: () => TFile | null;
	getGraphContainerEl: () => HTMLElement | null;
	onNodeClick: (filePath: string, event: MouseEvent) => void;
	onEdgeClick: (targetId: string, sourceId: string) => void;
	isZoomMode: () => boolean;
	isRelatedView: () => boolean;
	focusedNodeId: () => string | null;
	isUpdating: () => boolean;
}

export class GraphInteractionHandler {
	constructor(
		private readonly app: App,
		private readonly propertyTooltip: PropertyTooltip,
		private readonly nodeContextMenu: NodeContextMenu,
		private readonly edgeContextMenu: EdgeContextMenu,
		private readonly relationshipAdder: RelationshipAdder,
		private readonly config: GraphInteractionConfig
	) {}

	// Track background taps to detect double left-clicks for quick zoom
	private lastBackgroundTapTime = 0;
	private lastBackgroundTapRenderedPos: { x: number; y: number } | null = null;

	private get cy(): Core {
		return this.config.getCy();
	}

	setupInteractions(): void {
		this.setupHoverEffects();
		this.setupNodeHoverPreview();
		this.setupNodeClickHandler();
		this.setupEdgeClickHandler();
		this.setupNodeContextMenu();
		this.setupEdgeContextMenu();
		this.setupDoubleClickZoom();
		this.addSparkleAnimations();
	}

	private setupHoverEffects(): void {
		this.cy.on("mouseover", "node", (evt) => {
			const node = evt.target;
			this.cy.elements().removeClass("dim");
			this.cy.elements().not(node.closedNeighborhood()).addClass("dim");
			node.closedNeighborhood("edge").addClass("highlighted");
		});

		this.cy.on("mouseout", "node", () => {
			this.cy.elements().removeClass("dim highlighted");
		});
	}

	private setupNodeHoverPreview(): void {
		this.cy.on("mouseover", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const file = this.app.vault.getAbstractFileByPath(filePath);

			if (file instanceof TFile) {
				this.app.workspace.trigger("hover-link", {
					event: evt.originalEvent,
					source: this.config.viewType,
					hoverParent: this,
					targetEl: this.config.getGraphContainerEl(),
					linktext: file.path,
					sourcePath: this.config.getCurrentFile()?.path || "",
				});

				this.propertyTooltip.show(filePath, evt.originalEvent as MouseEvent);
			}
		});

		this.cy.on("mouseout", "node", () => {
			this.propertyTooltip.scheduleHide(300);
		});
	}

	private setupNodeClickHandler(): void {
		this.cy.on("tap", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const file = this.app.vault.getAbstractFileByPath(filePath);
			const originalEvent = evt.originalEvent as MouseEvent;

			if (file instanceof TFile) {
				// Check if we're in relationship selection mode
				if (this.relationshipAdder.isSelectionActive()) {
					this.relationshipAdder.completeSelection(filePath);
					return;
				}

				if (originalEvent && (originalEvent.ctrlKey || originalEvent.metaKey)) {
					this.app.workspace.getLeaf("tab").openFile(file);
					return;
				}

				this.config.onNodeClick(filePath, originalEvent);
			}
		});
	}

	private setupEdgeClickHandler(): void {
		this.cy.on("tap", "edge", (evt) => {
			if (!this.config.isZoomMode()) return;

			const edge = evt.target;
			const targetId = edge.data("target");
			const sourceId = edge.data("source");

			const nodeToFocus = targetId === this.config.focusedNodeId() ? sourceId : targetId;
			this.config.onEdgeClick(nodeToFocus, sourceId);
		});
	}

	private setupNodeContextMenu(): void {
		this.cy.on("cxttap", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const originalEvent = evt.originalEvent as MouseEvent;

			// Cancel relationship selection if right-clicking during selection
			if (this.relationshipAdder.isSelectionActive()) {
				this.relationshipAdder.cancel();
			}

			this.nodeContextMenu.show(originalEvent, filePath);
		});
	}

	private setupEdgeContextMenu(): void {
		this.cy.on("cxttap", "edge", (evt) => {
			const edge = evt.target;
			const sourceId = edge.data("source");
			const targetId = edge.data("target");
			const originalEvent = evt.originalEvent as MouseEvent;
			const isRelatedView = this.config.isRelatedView();

			this.edgeContextMenu.show(originalEvent, sourceId, targetId, isRelatedView);
		});
	}

	private setupDoubleClickZoom(): void {
		// Double left-click (double tap) on background zooms in toward clicked position
		this.cy.on("tap", (evt) => {
			// Only act on background taps to avoid interfering with node/edge interactions
			if (evt.target !== this.cy) return;

			const originalEvent = evt.originalEvent as MouseEvent | undefined;
			// Respect only left mouse button when available
			if (originalEvent && typeof originalEvent.button === "number" && originalEvent.button !== 0) return;

			const now = Date.now();
			const renderedPos = evt.renderedPosition;
			if (!renderedPos) return;

			const DOUBLE_TAP_MS = 300;
			const MAX_DISTANCE_PX = 24;

			const withinTime = now - this.lastBackgroundTapTime <= DOUBLE_TAP_MS;
			const withinDistance = this.lastBackgroundTapRenderedPos
				? Math.hypot(
						this.lastBackgroundTapRenderedPos.x - renderedPos.x,
						this.lastBackgroundTapRenderedPos.y - renderedPos.y
					) <= MAX_DISTANCE_PX
				: false;

			if (withinTime && withinDistance) {
				// Reset tracking
				this.lastBackgroundTapTime = 0;
				this.lastBackgroundTapRenderedPos = null;

				// Compute target zoom and pan to center the clicked model position
				const currentZoom = this.cy.zoom();
				const ZOOM_FACTOR = 1.6; // slightly aggressive to feel faster than wheel
				const targetZoom = Math.min(currentZoom * ZOOM_FACTOR, this.cy.maxZoom());
				const modelPos = evt.position;
				if (!modelPos) return;

				const viewportCenter = { x: this.cy.width() / 2, y: this.cy.height() / 2 };
				const targetPan = {
					x: viewportCenter.x - modelPos.x * targetZoom,
					y: viewportCenter.y - modelPos.y * targetZoom,
				};

				this.cy.stop();
				this.cy.animate({ zoom: targetZoom, pan: targetPan }, { duration: 160, easing: "ease-out" });
			} else {
				this.lastBackgroundTapTime = now;
				this.lastBackgroundTapRenderedPos = { x: renderedPos.x, y: renderedPos.y };
			}
		});
	}

	private addSparkleAnimations(): void {
		this.cy.nodes().forEach((node) => {
			if (Math.random() < 0.4) {
				node.addClass("glow");
				const pulse = (): void => {
					if (!node.cy() || this.config.isUpdating()) {
						return;
					}
					node.animate({ style: { "overlay-opacity": 0.35 } }, { duration: 1500, easing: "ease-in-out" }).animate(
						{ style: { "overlay-opacity": 0.12 } },
						{
							duration: 1500,
							easing: "ease-in-out",
							complete: pulse,
						}
					);
				};
				setTimeout(() => pulse(), Math.random() * 1000);
			}
		});
	}

	navigateToParent(currentNodeId: string): string | null {
		return this.navigateAlongEdge(currentNodeId, "incoming");
	}

	navigateToChild(currentNodeId: string): string | null {
		return this.navigateAlongEdge(currentNodeId, "outgoing");
	}

	private navigateAlongEdge(currentNodeId: string, direction: "incoming" | "outgoing"): string | null {
		const node = this.cy.getElementById(currentNodeId);
		if (!node.length) return null;

		const edges = node
			.connectedEdges()
			.filter((edge) =>
				direction === "incoming" ? edge.target().id() === currentNodeId : edge.source().id() === currentNodeId
			);

		if (!edges.length) return null;

		const dataKey = direction === "incoming" ? "source" : "target";
		return edges[0].data(dataKey);
	}

	navigateToLeft(currentNodeId: string): string | null {
		return this.navigateInDirection(currentNodeId, "left");
	}

	navigateToRight(currentNodeId: string): string | null {
		return this.navigateInDirection(currentNodeId, "right");
	}

	private navigateInDirection(currentNodeId: string, direction: "left" | "right"): string | null {
		const currentNode = this.cy.getElementById(currentNodeId);
		if (!currentNode.length) return null;

		const currentPos = currentNode.renderedPosition();
		if (!currentPos) return null;

		// Get all other nodes
		const otherNodes = this.cy.nodes().filter((n) => n.id() !== currentNodeId);

		// Vertical tolerance for "same height" (in pixels)
		// Nodes within this range are considered at the same level
		const VERTICAL_TOLERANCE = 50;

		let closestNode: any = null;
		let closestDistance = Number.POSITIVE_INFINITY;

		otherNodes.forEach((node) => {
			const pos = node.renderedPosition();
			if (!pos) return;

			// Check if node is at approximately the same vertical level
			const verticalDist = Math.abs(pos.y - currentPos.y);
			if (verticalDist > VERTICAL_TOLERANCE) return;

			// Check if node is in the correct horizontal direction
			const isInDirection = direction === "left" ? pos.x < currentPos.x : pos.x > currentPos.x;
			if (!isInDirection) return;

			// Calculate horizontal distance only (since we've already filtered by vertical level)
			const horizontalDist = Math.abs(pos.x - currentPos.x);

			if (horizontalDist < closestDistance) {
				closestDistance = horizontalDist;
				closestNode = node;
			}
		});

		return closestNode ? closestNode.id() : null;
	}

	cleanup(): void {
		this.cy.removeAllListeners();
	}
}
