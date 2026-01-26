import {
	type FrontmatterDiff,
	Indexer as GenericIndexer,
	type IndexerEvent as GenericIndexerEvent,
	type IndexerConfig,
	normalizeProperty,
} from "@real1ty-obsidian-plugins";
import type { App, TFile } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import { BehaviorSubject, Subject } from "rxjs";
import { RELATIONSHIP_CONFIGS, SCAN_CONCURRENCY } from "../types/constants";
import type { Frontmatter, NexusPropertiesSettings } from "../types/settings";

export interface FileRelationships {
	filePath: string;
	mtime: number;
	parent: string[];
	children: string[];
	related: string[];
	frontmatter: Frontmatter;
}

type IndexerEventType = "file-changed" | "file-deleted";

export interface IndexerEvent {
	type: IndexerEventType;
	filePath: string;
	oldRelationships?: FileRelationships;
	newRelationships?: FileRelationships;
	oldFrontmatter?: Frontmatter;
	frontmatterDiff?: FrontmatterDiff;
}

/**
 * Wrapper around the generic Indexer from utils that adds relationship tracking.
 * Listens to generic indexer events and enhances them with relationship data.
 */
export class Indexer {
	private settings: NexusPropertiesSettings;
	private genericIndexer: GenericIndexer;
	private settingsSubscription: Subscription | null = null;
	private scanEventsSubject = new Subject<IndexerEvent>();
	private relationshipsCache = new Map<string, FileRelationships>();

	public readonly events$: Observable<IndexerEvent>;

	constructor(
		private app: App,
		settingsStore: BehaviorSubject<NexusPropertiesSettings>
	) {
		this.settings = settingsStore.value;

		const configStore = new BehaviorSubject<IndexerConfig>(this.buildIndexerConfig());
		this.genericIndexer = new GenericIndexer(app, configStore);
		this.genericIndexer.events$.subscribe((genericEvent) => {
			this.handleGenericEvent(genericEvent);
		});

		this.settingsSubscription = settingsStore.subscribe((newSettings) => {
			this.settings = newSettings;
			configStore.next(this.buildIndexerConfig());
		});

		this.events$ = this.scanEventsSubject.asObservable();
	}

	private buildIndexerConfig(): IndexerConfig {
		return {
			includeFile: (filePath: string) => this.shouldIndexFile(filePath),
			scanConcurrency: SCAN_CONCURRENCY,
			debounceMs: 300,
		};
	}

	async start(): Promise<void> {
		await this.genericIndexer.start();
	}

	stop(): void {
		this.genericIndexer.stop();
		this.settingsSubscription?.unsubscribe();
		this.settingsSubscription = null;
		this.relationshipsCache.clear();
	}

	async scanAllFiles(): Promise<void> {
		await this.genericIndexer.resync();
	}

	shouldIndexFile(filePath: string): boolean {
		if (this.settings.directories.includes("*")) {
			return true;
		}
		return this.settings.directories.some((dir) => {
			const normalizedDir = dir.endsWith("/") ? dir.slice(0, -1) : dir;
			return filePath === normalizedDir || filePath.startsWith(`${normalizedDir}/`);
		});
	}

	private handleGenericEvent(genericEvent: GenericIndexerEvent): void {
		if (genericEvent.type === "file-deleted") {
			// Ignore delete events that are part of renames - Obsidian handles link updates automatically
			if (genericEvent.isRename) {
				return;
			}

			const { filePath } = genericEvent;
			const oldRelationships = this.relationshipsCache.get(filePath);
			this.relationshipsCache.delete(filePath);

			this.scanEventsSubject.next({
				type: "file-deleted",
				filePath,
				oldRelationships,
				oldFrontmatter: oldRelationships?.frontmatter,
			});
			return;
		}

		if (genericEvent.type === "file-changed" && genericEvent.source) {
			const { filePath, source, oldFrontmatter, frontmatterDiff, oldPath } = genericEvent;

			// If this is a rename (oldPath is set), update cache silently without emitting an event.
			// Obsidian handles link updates, so components just need the updated cache.
			if (oldPath) {
				const file = this.app.vault.getFileByPath(filePath);
				if (file) {
					const newRelationships = this.extractRelationships(file, source.frontmatter);
					this.relationshipsCache.delete(oldPath);
					this.relationshipsCache.set(filePath, newRelationships);
				}
				return;
			}

			// Regular file change (not a rename)
			const file = this.app.vault.getFileByPath(filePath);
			if (!file) return;

			const oldRelationships = this.relationshipsCache.get(filePath);
			const newRelationships = this.extractRelationships(file, source.frontmatter);

			this.relationshipsCache.set(filePath, newRelationships);

			this.scanEventsSubject.next({
				type: "file-changed",
				filePath,
				oldRelationships,
				newRelationships,
				oldFrontmatter,
				frontmatterDiff,
			});
		}
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
			relationships[config.type] = normalizedValue;
		}

		return relationships;
	}
}
