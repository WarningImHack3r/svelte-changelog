import { repo } from "remult";
import { CacheEntry } from "./db/CacheEntry";
import { ddebug } from "$lib/debug";

export type CacheJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class CacheHandler {
	// Cache stats tracking
	#stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
	#statsInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.#statsInterval = setInterval(() => this.#logStats(), 60_000);
	}

	#logStats() {
		const total = this.#stats.hits + this.#stats.misses;
		if (total === 0) return;
		const hitRate = total > 0 ? ((this.#stats.hits / total) * 100).toFixed(1) : "0";
		console.log(
			`[cache-stats] hits=${this.#stats.hits} misses=${this.#stats.misses} hit_rate=${hitRate}% sets=${this.#stats.sets} deletes=${this.#stats.deletes}`
		);
		this.#stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
	}

	async get<T extends CacheJson>(key: string) {
		ddebug(`Retrieving ${key} from SQLite cache`);
		const entry = await repo(CacheEntry).findFirst({ key });

		if (!entry) {
			ddebug("Nothing to retrieve");
			this.#stats.misses++;
			console.log(`[cache] MISS ${key}`);
			return null;
		}

		if (entry.expiresAt && entry.expiresAt < new Date()) {
			ddebug("Value expired");
			this.#stats.misses++;
			console.log(`[cache] EXPIRED ${key}`);
			return null;
		}

		ddebug("Returning found value from SQLite cache");
		this.#stats.hits++;
		console.log(`[cache] HIT ${key}`);
		return entry.value as T;
	}

	async set<T extends CacheJson>(key: string, value: T, ttlSeconds?: number) {
		this.#stats.sets++;
		const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
		console.log(`[cache] SET ${key} ttl=${ttlSeconds ?? "none"}s`);

		await repo(CacheEntry).upsert({ where: { key }, set: { value: value as {}, expiresAt } });
	}

	async getStale<T extends CacheJson>(key: string): Promise<{ value: T; etag: string } | null> {
		const entry = await repo(CacheEntry).findFirst({ key });
		if (entry?.etag) {
			return { value: entry.value as T, etag: entry.etag };
		}
		return null;
	}

	async refreshTtl(key: string, ttlSeconds?: number) {
		const entry = await repo(CacheEntry).findFirst({ key });
		if (!entry) return;
		entry.expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
		await repo(CacheEntry).save(entry);
		console.log(`[cache] REFRESH-TTL ${key} ttl=${ttlSeconds ?? "none"}s`);
	}

	async setWithEtag<T extends CacheJson>(key: string, value: T, etag: string, ttlSeconds?: number) {
		this.#stats.sets++;
		const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
		console.log(`[cache] SET ${key} ttl=${ttlSeconds ?? "none"}s`);

		await repo(CacheEntry).upsert({ where: { key }, set: { value: value as {}, expiresAt, etag } });
		console.log(`[cache] ETAG stored for ${key}: ${etag.substring(0, 20)}...`);
	}

	async delete(key: string) {
		this.#stats.deletes++;
		console.log(`[cache] DELETE ${key}`);
		const entry = await repo(CacheEntry).findFirst({ key });
		if (!entry) return false;
		await repo(CacheEntry).delete(entry);
		return true;
	}
}
