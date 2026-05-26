import { repo } from "remult";
import { ddebug } from "$lib/logging";
import { CacheEntry } from "./db/CacheEntry";

export type CacheJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class KVCache {
	/**
	 * Get a value from the cache
	 *
	 * @param key the key to get the result for
	 * @returns the cached value, or `null` if not present
	 */
	async get<T extends CacheJson>(key: string): Promise<T | null> {
		ddebug(`Retrieving ${key} from cache`);
		const entry = await repo(CacheEntry).findFirst({ key });

		if (!entry) {
			ddebug("Nothing to retrieve");
			return null;
		}

		if (entry.expiresAt && entry.expiresAt < new Date()) {
			ddebug("Value expired");
			return null;
		}

		ddebug("Returning found value from cache");
		return entry.value as T;
	}

	/**
	 * Set a value in the cache
	 *
	 * @param key the key to store the value for
	 * @param value the value to store
	 * @param ttlSeconds the optional TTL to set for expiration
	 */
	async set(key: string, value: CacheJson, ttlSeconds?: number) {
		const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
		await repo(CacheEntry).upsert({ where: { key }, set: { value: value as object, expiresAt } });
	}

	async getStale(key: string) {
		const entry = await repo(CacheEntry).findFirst({ key });
		if (entry?.etag) {
			return { value: entry.value as CacheJson, etag: entry.etag };
		}
		return null;
	}

	async refreshTtl(key: string, ttlSeconds?: number) {
		const entry = await repo(CacheEntry).findFirst({ key });
		if (!entry) return;
		entry.expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
		await repo(CacheEntry).save(entry);
	}

	async setWithEtag(key: string, value: CacheJson, etag: string, ttlSeconds?: number) {
		const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
		await repo(CacheEntry).upsert({
			where: { key },
			set: { value: value as object, expiresAt, etag }
		});
	}

	/**
	 * Deletes an entry in the cache
	 *
	 * @param key the key to delete
	 * @returns whether the element was actually removed
	 */
	async delete(key: string) {
		const entry = await repo(CacheEntry).findFirst({ key });
		if (!entry) return false;
		await repo(CacheEntry).delete(entry);
		return true;
	}
}
