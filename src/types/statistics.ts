export interface NodeStatistics {
	parents: number;
	children: number;
	related: number;
	allParents: Set<string>;
	allChildren: Set<string>;
	allRelated: Set<string>;
}
