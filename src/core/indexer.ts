import {
	type FrontmatterDiff,
	Indexer as GenericIndexer,
	type IndexerEvent as GenericIndexerEvent,
	type IndexerConfig,
	normalizeProperty,
} from "@real1ty-obsidian-plugins/utils";
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
			includeFile: this.shouldIndexFile.bind(this),
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
		const { directories } = this.settings;

		if (directories.includes("*")) {
			return true;
		}

		return directories.some((dir) => {
			const normalizedDir = dir.endsWith("/") ? dir.slice(0, -1) : dir;
			return filePath === normalizedDir || filePath.startsWith(`${normalizedDir}/`);
		});
	}

	private handleGenericEvent(genericEvent: GenericIndexerEvent): void {
		if (genericEvent.type === "file-deleted") {
			const oldRelationships = this.relationshipsCache.get(genericEvent.filePath);
			const oldFrontmatter = oldRelationships?.frontmatter;

			this.relationshipsCache.delete(genericEvent.filePath);

			this.scanEventsSubject.next({
				type: "file-deleted",
				filePath: genericEvent.filePath,
				oldRelationships,
				oldFrontmatter,
			});
			return;
		}

		if (genericEvent.type === "file-changed" && genericEvent.source) {
			const { filePath, source, oldFrontmatter, frontmatterDiff } = genericEvent;
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
