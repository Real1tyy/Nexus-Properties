import { extractFilePath } from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";
import type { FileRelationships } from "../types/constants";
import type { VaultStatistics } from "../types/statistics";

export type LinkResolver = (link: string, sourcePath: string) => string | null;

export function createObsidianLinkResolver(app: App, cache: ReadonlyMap<string, FileRelationships>): LinkResolver {
	return (link: string, sourcePath: string) => {
		const linkPath = extractFilePath(link);
		const file = app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
		if (file && cache.has(file.path)) {
			return file.path;
		}
		return null;
	};
}

export function computeVaultStatistics(
	cache: ReadonlyMap<string, FileRelationships>,
	resolveLink: LinkResolver
): VaultStatistics {
	let nodesWithParents = 0;
	let nodesWithChildren = 0;
	let nodesWithRelated = 0;
	const roots: string[] = [];

	for (const [filePath, rel] of cache) {
		if (rel.parent.length > 0) {
			nodesWithParents++;
		} else {
			roots.push(filePath);
		}

		if (rel.children.length > 0) {
			nodesWithChildren++;
		}

		if (rel.related.length > 0) {
			nodesWithRelated++;
		}
	}

	let maxDepth = 0;
	let totalDepth = 0;

	for (const root of roots) {
		const depth = bfsMaxDepth(root, cache, resolveLink);
		totalDepth += depth;
		if (depth > maxDepth) {
			maxDepth = depth;
		}
	}

	const treeCount = roots.length;
	const avgDepth = treeCount > 0 ? totalDepth / treeCount : 0;

	return {
		totalNodes: cache.size,
		treeCount,
		avgDepth: Math.round(avgDepth * 100) / 100,
		maxDepth,
		nodesWithParents,
		nodesWithChildren,
		nodesWithRelated,
	};
}

function bfsMaxDepth(root: string, cache: ReadonlyMap<string, FileRelationships>, resolveLink: LinkResolver): number {
	const visited = new Set<string>();
	let depth = 0;
	let currentLevel = [root];
	visited.add(root);

	while (currentLevel.length > 0) {
		const nextLevel: string[] = [];

		for (const filePath of currentLevel) {
			const rel = cache.get(filePath);
			if (!rel) continue;

			for (const childLink of rel.children) {
				const resolved = resolveLink(childLink, filePath);
				if (resolved && !visited.has(resolved)) {
					visited.add(resolved);
					nextLevel.push(resolved);
				}
			}
		}

		if (nextLevel.length > 0) {
			depth++;
		}

		currentLevel = nextLevel;
	}

	return depth;
}
