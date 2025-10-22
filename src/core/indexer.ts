import { type App, type MetadataCache, type TAbstractFile, TFile, type Vault } from "obsidian";
import {
	type BehaviorSubject,
	from,
	fromEventPattern,
	lastValueFrom,
	merge,
	type Observable,
	of,
	Subject,
	type Subscription,
} from "rxjs";
import { debounceTime, filter, groupBy, map, mergeMap, switchMap, toArray } from "rxjs/operators";
import { RELATIONSHIP_CONFIGS, SCAN_CONCURRENCY } from "../types/constants";
import type { Frontmatter, NexusPropertiesSettings } from "../types/settings";
import { normalizeProperty, parseWikiLink } from "../utils/frontmatter-value";

export interface FileRelationships {
	filePath: string;
	mtime: number;
	parent: string[];
	children: string[];
	related: string[];
	frontmatter: Frontmatter;
}

export type IndexerEventType = "file-changed" | "file-deleted";

export interface IndexerEvent {
	type: IndexerEventType;
	filePath: string;
	oldRelationships?: FileRelationships;
	newRelationships?: FileRelationships;
}

type VaultEvent = "create" | "modify" | "delete" | "rename";
type FileIntent = { kind: "changed"; file: TFile; path: string } | { kind: "deleted"; path: string };

export class Indexer {
	private settings: NexusPropertiesSettings;
	private fileSub: Subscription | null = null;
	private settingsSubscription: Subscription | null = null;
	private vault: Vault;
	private metadataCache: MetadataCache;
	private scanEventsSubject = new Subject<IndexerEvent>();
	private relationshipsCache = new Map<string, FileRelationships>();

	public readonly events$: Observable<IndexerEvent>;

	constructor(app: App, settingsStore: BehaviorSubject<NexusPropertiesSettings>) {
		this.vault = app.vault;
		this.metadataCache = app.metadataCache;
		this.settings = settingsStore.value;

		this.settingsSubscription = settingsStore.subscribe((newSettings) => {
			this.settings = newSettings;
		});

		this.events$ = this.scanEventsSubject.asObservable();
	}

	async start(): Promise<void> {
		await this.buildInitialCache();

		const fileSystemEvents$ = this.buildFileSystemEvents$();
		this.fileSub = fileSystemEvents$.subscribe((event) => {
			this.scanEventsSubject.next(event);
		});
	}

	stop(): void {
		this.fileSub?.unsubscribe();
		this.fileSub = null;

		this.settingsSubscription?.unsubscribe();
		this.settingsSubscription = null;

		this.relationshipsCache.clear();
	}

	private async buildInitialCache(): Promise<void> {
		const allFiles = this.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => this.shouldIndexFile(file.path));

		for (const file of relevantFiles) {
			const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter;
			if (frontmatter) {
				const relationships = this.extractRelationships(file, frontmatter);
				this.relationshipsCache.set(file.path, relationships);
			}
		}
	}

	async scanAllFiles(): Promise<void> {
		const allFiles = this.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => this.shouldIndexFile(file.path));

		const events$ = from(relevantFiles).pipe(
			mergeMap(async (file) => {
				try {
					return await this.buildEvent(file);
				} catch (error) {
					console.error(`Error processing file ${file.path}:`, error);
					return null;
				}
			}, SCAN_CONCURRENCY),
			filter((event): event is IndexerEvent => event !== null),
			toArray()
		);

		try {
			const allEvents = await lastValueFrom(events$);

			for (const event of allEvents) {
				this.scanEventsSubject.next(event);
			}
		} catch (error) {
			console.error("❌ Error during file scanning:", error);
		}
	}

	private fromVaultEvent(eventName: VaultEvent): Observable<any> {
		return fromEventPattern(
			(handler) => this.vault.on(eventName as any, handler),
			(handler) => this.vault.off(eventName as any, handler)
		);
	}

	private static isMarkdownFile(f: TAbstractFile): f is TFile {
		return f instanceof TFile && f.extension === "md";
	}

	shouldIndexFile(filePath: string): boolean {
		const { directories } = this.settings;

		// If directories contains "*", scan all files
		if (directories.includes("*")) {
			return true;
		}

		// Check if file path starts with any of the configured directories
		return directories.some((dir) => {
			// Normalize directory path (remove trailing slash if present)
			const normalizedDir = dir.endsWith("/") ? dir.slice(0, -1) : dir;

			// Check if file path starts with the directory path
			return filePath === normalizedDir || filePath.startsWith(`${normalizedDir}/`);
		});
	}

	private toRelevantFiles<T extends TAbstractFile>() {
		return (source: Observable<T>) =>
			source.pipe(
				filter(Indexer.isMarkdownFile),
				filter((f) => this.shouldIndexFile(f.path))
			);
	}

	private debounceByPath<T>(ms: number, key: (x: T) => string) {
		return (source: Observable<T>) =>
			source.pipe(
				groupBy(key),
				mergeMap((g$) => g$.pipe(debounceTime(ms)))
			);
	}

	private buildFileSystemEvents$(): Observable<IndexerEvent> {
		const created$ = this.fromVaultEvent("create").pipe(this.toRelevantFiles());
		const modified$ = this.fromVaultEvent("modify").pipe(this.toRelevantFiles());
		const deleted$ = this.fromVaultEvent("delete").pipe(this.toRelevantFiles());
		const renamed$ = this.fromVaultEvent("rename");

		const changedIntents$ = merge(created$, modified$).pipe(
			this.debounceByPath(300, (f) => f.path),
			map((file): FileIntent => ({ kind: "changed", file, path: file.path }))
		);

		const deletedIntents$ = deleted$.pipe(map((file): FileIntent => ({ kind: "deleted", path: file.path })));

		// Handle renames by updating the cache internally without emitting events
		// Obsidian automatically updates all wiki links, so we just sync the cache
		// Debounce by 1.5 seconds to let Obsidian finish updating all links
		renamed$
			.pipe(
				filter(([f]) => Indexer.isMarkdownFile(f)),
				debounceTime(1500)
			)
			.subscribe(([newFile, oldPath]) => {
				this.handleRename(newFile, oldPath);
			});

		const intents$ = merge(changedIntents$, deletedIntents$);

		return intents$.pipe(
			switchMap((intent) => {
				if (intent.kind === "deleted") {
					const oldRelationships = this.relationshipsCache.get(intent.path);
					this.relationshipsCache.delete(intent.path);

					return of<IndexerEvent>({
						type: "file-deleted",
						filePath: intent.path,
						oldRelationships,
					});
				}
				return from(this.buildEvent(intent.file)).pipe(filter((e): e is IndexerEvent => e !== null));
			})
		);
	}

	private handleRename(newFile: TFile, oldPath: string): void {
		const oldRelationships = this.relationshipsCache.get(oldPath);
		const frontmatter = this.metadataCache.getFileCache(newFile)?.frontmatter;

		if (!frontmatter || !oldRelationships) {
			return;
		}

		// Update cache for renamed file
		const newRelationships = this.extractRelationships(newFile, frontmatter);
		this.relationshipsCache.delete(oldPath);
		this.relationshipsCache.set(newFile.path, newRelationships);

		// Collect affected files from old relationships
		const affectedFiles = new Set<string>();

		const addAffectedFiles = (wikiLinks: string[]) => {
			wikiLinks
				.map(wikiLink => parseWikiLink(wikiLink))
				.filter(parsed => parsed?.linkPath)
				.map(parsed => this.vault.getFileByPath(`${parsed!.linkPath}.md`))
				.filter(file => file !== null)
				.forEach(file => {
					affectedFiles.add(file.path);
				});
		};

		addAffectedFiles(oldRelationships.parent);
		addAffectedFiles(oldRelationships.children);
		addAffectedFiles(oldRelationships.related);

		// Re-extract relationships from frontmatter for all affected files
		// Obsidian has already updated their frontmatter with the new file name
		const updatedPaths = [newFile.path];
		for (const filePath of affectedFiles) {
			const file = this.vault.getFileByPath(filePath);
			if (file === null) continue;

			const fm = this.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm) continue;

			const updatedRelationships = this.extractRelationships(file, fm);
			this.relationshipsCache.set(filePath, updatedRelationships);
			updatedPaths.push(filePath);
		}
	}

	private async buildEvent(file: TFile): Promise<IndexerEvent | null> {
		const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter;
		if (!frontmatter) {
			return null;
		}

		const oldRelationships = this.relationshipsCache.get(file.path);
		const newRelationships = this.extractRelationships(file, frontmatter);

		// Update cache with new relationships
		this.relationshipsCache.set(file.path, newRelationships);

		return {
			type: "file-changed",
			filePath: file.path,
			oldRelationships,
			newRelationships,
		};
	}

	extractRelationships(file: TFile, frontmatter: Frontmatter): FileRelationships {
		const relationships: FileRelationships = {
			filePath: file.path,
			mtime: file.stat.mtime,
			parent: [],
			children: [],
			related: [],
			frontmatter,
		};

		for (const config of RELATIONSHIP_CONFIGS) {
			const propName = config.getProp(this.settings);
			const normalizedValue = normalizeProperty(frontmatter[propName], propName);

			switch (config.type) {
				case "parent":
					relationships.parent = normalizedValue;
					break;
				case "children":
					relationships.children = normalizedValue;
					break;
				case "related":
					relationships.related = normalizedValue;
					break;
			}
		}

		return relationships;
	}
}
