import { repo } from "remult";
import { ddebug } from "$lib/debug";
import { CacheEntry } from "./db/CacheEntry";

export type CacheJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class CacheHandler {
	async get<T extends CacheJson>(key: string) {
		ddebug(`Retrieving ${key} from SQLite cache`);
		const entry = await repo(CacheEntry).findFirst({ key });

		if (!entry) {
			ddebug("Nothing to retrieve");
			return null;
		}

		if (entry.expiresAt && entry.expiresAt < new Date()) {
			ddebug("Value expired");
			return null;
		}

		ddebug("Returning found value from SQLite cache");
		return entry.value as T;
	}

	async set<T extends CacheJson>(key: string, value: T, ttlSeconds?: number) {
		const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
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
	}

	async setWithEtag<T extends CacheJson>(key: string, value: T, etag: string, ttlSeconds?: number) {
		const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
		await repo(CacheEntry).upsert({ where: { key }, set: { value: value as {}, expiresAt, etag } });
	}

	async delete(key: string) {
		const entry = await repo(CacheEntry).findFirst({ key });
		if (!entry) return false;
		await repo(CacheEntry).delete(entry);
		return true;
	}
}
