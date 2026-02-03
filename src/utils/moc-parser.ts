// MOC (Map of Content) Parser
// Parses markdown bullet lists (using - or .) into a hierarchy tree

import { parseFileContent } from "@real1ty-obsidian-plugins";

export interface MocNode {
	wikiLink: string;
	displayText: string;
	notePath: string;
	children: MocNode[];
	indentLevel: number;
}

export interface MocParseResult {
	roots: MocNode[];
	allLinks: Set<string>;
}

export interface WikiLinkInfo {
	wikiLink: string;
	notePath: string;
	displayText: string;
}

interface ParsedLine {
	indentLevel: number;
	links: WikiLinkInfo[];
	rawContent: string;
}

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Matches bullet items starting with - or . (after optional whitespace)
const BULLET_REGEX = /^(\s*)[-.]\s+(.*)$/;

export function extractWikiLinksFromLine(line: string): WikiLinkInfo[] {
	WIKILINK_REGEX.lastIndex = 0;

	return Array.from(line.matchAll(WIKILINK_REGEX)).map((match) => {
		const fullMatch = match[0];
		const notePath = match[1].trim();
		const alias = match[2]?.trim();
		const displayText = alias || notePath.split("/").pop() || notePath;

		return { wikiLink: fullMatch, notePath, displayText };
	});
}

// Tabs count as 4 spaces, then normalize to 2-space levels
function calculateIndentLevel(leadingWhitespace: string): number {
	let spaces = 0;
	for (const char of leadingWhitespace) {
		spaces += char === "\t" ? 4 : 1;
	}
	return Math.floor(spaces / 2);
}

function parseLine(line: string): ParsedLine | null {
	const match = line.match(BULLET_REGEX);
	if (!match) return null;

	const leadingWhitespace = match[1];
	const content = match[2];

	const links = extractWikiLinksFromLine(content);
	if (links.length === 0) return null;

	return {
		indentLevel: calculateIndentLevel(leadingWhitespace),
		links,
		rawContent: content,
	};
}

// Uses a stack to track parents - pop entries at same/deeper level to find correct parent
function buildMocTree(parsedLines: ParsedLine[]): MocNode[] {
	const roots: MocNode[] = [];
	const stack: Array<{ level: number; node: MocNode }> = [];

	for (const line of parsedLines) {
		// First wikilink is the node identity
		const primaryLink = line.links[0];

		const node: MocNode = {
			wikiLink: primaryLink.wikiLink,
			displayText: primaryLink.displayText,
			notePath: primaryLink.notePath,
			children: [],
			indentLevel: line.indentLevel,
		};

		while (stack.length > 0 && stack[stack.length - 1].level >= line.indentLevel) {
			stack.pop();
		}

		if (stack.length === 0) {
			roots.push(node);
		} else {
			stack[stack.length - 1].node.children.push(node);
		}

		stack.push({ level: line.indentLevel, node });
	}

	return roots;
}

function collectAllLinks(nodes: MocNode[], links: Set<string>): void {
	for (const node of nodes) {
		links.add(node.notePath);
		collectAllLinks(node.children, links);
	}
}

export function parseMocContent(content: string): MocParseResult {
	// Strip frontmatter to avoid parsing wiki links from YAML properties
	const { body } = parseFileContent(content);
	const lines = body.split("\n");
	const parsedLines: ParsedLine[] = [];

	for (const line of lines) {
		const parsed = parseLine(line);
		if (parsed) {
			parsedLines.push(parsed);
		}
	}

	const roots = buildMocTree(parsedLines);
	const allLinks = new Set<string>();
	collectAllLinks(roots, allLinks);

	return { roots, allLinks };
}

export function findMocNode(nodes: MocNode[], notePath: string): MocNode | undefined {
	for (const node of nodes) {
		if (node.notePath === notePath) {
			return node;
		}
		const found = findMocNode(node.children, notePath);
		if (found) return found;
	}
	return undefined;
}

export function getSubtree(roots: MocNode[], notePath: string): MocNode | undefined {
	return findMocNode(roots, notePath);
}

// Returns ancestor paths from root down to (but not including) the target
export function findAncestorPaths(nodes: MocNode[], targetPath: string, currentPath: string[] = []): string[] {
	for (const node of nodes) {
		if (node.notePath === targetPath) {
			return currentPath;
		}

		const newPath = [...currentPath, node.notePath];
		const result = findAncestorPaths(node.children, targetPath, newPath);
		if (result.length > 0 || node.children.some((c) => c.notePath === targetPath)) {
			return result.length > 0 ? result : newPath;
		}
	}
	return [];
}
