export interface NodeStatistics {
	parents: number;
	children: number;
	related: number;
	allParents: Set<string>;
	allChildren: Set<string>;
	allRelated: Set<string>;
}

export interface VaultStatistics {
	totalNodes: number;
	treeCount: number;
	avgDepth: number;
	maxDepth: number;
	nodesWithParents: number;
	nodesWithChildren: number;
	nodesWithRelated: number;
}
