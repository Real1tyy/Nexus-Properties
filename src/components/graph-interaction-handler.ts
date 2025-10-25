import type { Core } from "cytoscape";
import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { NodeContextMenu } from "./node-context-menu";
import type { PropertyTooltip } from "./property-tooltip";

export interface GraphInteractionConfig {
	getCy: () => Core;
	viewType: string;
	getCurrentFile: () => TFile | null;
	getGraphContainerEl: () => HTMLElement | null;
	onNodeClick: (filePath: string, event: MouseEvent) => void;
	onEdgeClick: (targetId: string, sourceId: string) => void;
	isZoomMode: () => boolean;
	focusedNodeId: () => string | null;
	isUpdating: () => boolean;
}

export class GraphInteractionHandler {
	constructor(
		private readonly app: App,
		private readonly propertyTooltip: PropertyTooltip,
		private readonly contextMenu: NodeContextMenu,
		private readonly config: GraphInteractionConfig
	) {}

	private get cy(): Core {
		return this.config.getCy();
	}

	setupInteractions(): void {
		this.setupHoverEffects();
		this.setupNodeHoverPreview();
		this.setupNodeClickHandler();
		this.setupEdgeClickHandler();
		this.setupContextMenu();
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

	private setupContextMenu(): void {
		this.cy.on("cxttap", "node", (evt) => {
			const node = evt.target;
			const filePath = node.id();
			const originalEvent = evt.originalEvent as MouseEvent;

			this.contextMenu.show(originalEvent, filePath);
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

	cleanup(): void {
		this.cy.removeAllListeners();
	}
}
