import type { Redis } from "@upstash/redis";
import { ddebug, derror } from "$lib/debug";

export type RedisJson = Parameters<InstanceType<typeof Redis>["json"]["set"]>[2];

export class CacheHandler {
	readonly #redis: Redis;
	readonly #memoryCache: Map<string, { value: unknown; expiresAt: number | null; etag?: string }>;
	readonly #isDev: boolean;

	// Cache stats tracking
	#stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
	#statsInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Initialize the cache handler
	 *
	 * @param redis the Redis instance
	 * @param isDev whether we're in dev or prod
	 */
	constructor(redis: Redis, isDev: boolean) {
		this.#redis = redis;
		this.#memoryCache = new Map();
		this.#isDev = isDev;

		// Log cache stats every 60s
		this.#statsInterval = setInterval(() => this.#logStats(), 60_000);
	}

	#logStats() {
		const total = this.#stats.hits + this.#stats.misses;
		if (total === 0) return;
		const hitRate = total > 0 ? ((this.#stats.hits / total) * 100).toFixed(1) : "0";
		console.log(
			`[cache-stats] entries=${this.#memoryCache.size} hits=${this.#stats.hits} misses=${this.#stats.misses} hit_rate=${hitRate}% sets=${this.#stats.sets} deletes=${this.#stats.deletes}`
		);
		// Reset after logging
		this.#stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
	}

	/**
	 * Get a value from the cache
	 *
	 * @param key the key to get the result for
	 * @returns the cached value, or `null` if not present
	 */
	async get<T extends RedisJson>(key: string) {
		if (this.#isDev) {
			ddebug(`Retrieving ${key} from in-memory cache`);
			// In dev mode, use memory cache only
			const entry = this.#memoryCache.get(key);

			if (!entry) {
				ddebug("Nothing to retrieve");
				this.#stats.misses++;
				console.log(`[cache] MISS ${key}`);
				return null;
			}

			// Check if entry is expired
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				ddebug("Value expired, purging and returning null");
				this.#memoryCache.delete(key);
				this.#stats.misses++;
				console.log(`[cache] EXPIRED ${key}`);
				return null;
			}

			ddebug("Returning found value from in-memory cache");
			this.#stats.hits++;
			console.log(`[cache] HIT ${key}`);
			return entry.value as T;
		}

		// Production mode
		const entry = this.#memoryCache.get(key);
		if (entry) {
			// Check if entry has expired based on our cached expiresAt
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				this.#memoryCache.delete(key);
				this.#stats.misses++;
				console.log(`[cache] EXPIRED ${key}`);
				return null;
			}
			this.#stats.hits++;
			console.log(`[cache] HIT ${key}`);
			return entry.value as T;
		}

		// No cache entry, try Redis
		try {
			const value = await this.#redis.json.get<T>(key);
			if (value !== null) {
				// Get TTL only when populating the cache for the first time
				const ttl = await this.#redis.ttl(key);
				const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
				this.#memoryCache.set(key, { value, expiresAt });
				this.#stats.hits++;
				console.log(`[cache] HIT(redis) ${key}`);
			} else {
				this.#stats.misses++;
				console.log(`[cache] MISS ${key}`);
			}
			return value;
		} catch (error) {
			derror("Redis get error:", error);
			this.#stats.misses++;
			return null;
		}
	}

	/**
	 * Set a value in the cache
	 *
	 * @param key the key to store the value for
	 * @param value the value to store
	 * @param ttlSeconds the optional TTL to set for expiration
	 */
	async set<T extends RedisJson>(key: string, value: T, ttlSeconds?: number) {
		this.#stats.sets++;
		if (this.#isDev) {
			ddebug(`Setting value for ${key} in memory cache`);
			// In dev mode, use memory cache only
			const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
			if (expiresAt) {
				ddebug(`Defining cache for ${key}, expires at ${new Date(expiresAt)}`);
			} else ddebug(`No cache set for ${key}`);
			console.log(`[cache] SET ${key} ttl=${ttlSeconds ?? "none"}s entries=${this.#memoryCache.size + 1}`);
			this.#memoryCache.set(key, { value, expiresAt });
		} else {
			// In production, use both Redis and memory cache
			try {
				await this.#redis.json.set(key, "$", value);
				if (ttlSeconds) await this.#redis.expire(key, ttlSeconds);
				// Mirror in the memory cache
				const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
				this.#memoryCache.set(key, { value, expiresAt });
			} catch (error) {
				derror("Redis set error:", error);
			}
		}
	}

	/**
	 * Get stale (expired) data + etag for conditional requests.
	 * Returns null if no data exists at all (true cold miss).
	 */
	getStale<T extends RedisJson>(key: string): { value: T; etag: string } | null {
		const entry = this.#memoryCache.get(key);
		if (entry?.etag) {
			return { value: entry.value as T, etag: entry.etag };
		}
		return null;
	}

	/**
	 * Refresh TTL on an existing entry (used after 304 Not Modified)
	 */
	async refreshTtl(key: string, ttlSeconds?: number) {
		const entry = this.#memoryCache.get(key);
		if (!entry) return;
		entry.expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
		console.log(`[cache] REFRESH-TTL ${key} ttl=${ttlSeconds ?? "none"}s`);
		if (!this.#isDev) {
			try {
				if (ttlSeconds) await this.#redis.expire(key, ttlSeconds);
			} catch (error) {
				derror("Redis expire error:", error);
			}
		}
	}

	/**
	 * Set a value in the cache with an optional etag
	 */
	async setWithEtag<T extends RedisJson>(key: string, value: T, etag: string, ttlSeconds?: number) {
		await this.set(key, value, ttlSeconds);
		const entry = this.#memoryCache.get(key);
		if (entry) {
			entry.etag = etag;
			console.log(`[cache] ETAG stored for ${key}: ${etag.substring(0, 20)}...`);
		}
	}

	/**
	 * Deletes an entry in the cache
	 *
	 * @param key the key to delete
	 * @returns whether the element was actually removed
	 */
	async delete(key: string) {
		this.#stats.deletes++;
		console.log(`[cache] DELETE ${key}`);
		// In dev mode, we only have the in-memory cache, so we wipe it
		if (this.#isDev) {
			return this.#memoryCache.delete(key);
		}
		// In production, we clean Redis and then the memory cache if Redis didn't unexpectedly fail
		try {
			const deletedCount = await this.#redis.del(key);
			this.#memoryCache.delete(key);
			return deletedCount > 0;
		} catch (error) {
			derror("Redis delete error:", error);
			return false;
		}
	}
}
