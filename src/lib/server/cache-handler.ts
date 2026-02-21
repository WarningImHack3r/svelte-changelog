import type { RedisClientType, RedisJSON } from "redis";
import { ddebug, derror } from "$lib/debug";

export class CacheHandler {
	readonly #redis: RedisClientType; // TODO: disconnect after usage?
	readonly #memoryCache: Map<string, { value: unknown; expiresAt: number | null }>;
	readonly #isDev: boolean;
	#connectPromise: Promise<RedisClientType> | null = null;

	/**
	 * Initialize the cache handler
	 *
	 * @param redis the Redis instance
	 * @param isDev whether we're in dev or prod
	 */
	constructor(redis: RedisClientType, isDev: boolean) {
		this.#redis = redis.on("error", derror);
		this.#memoryCache = new Map();
		this.#isDev = isDev;
	}

	/**
	 * Lazily connect the Redis client to the server as needed,
	 * supporting concurrent connections
	 *
	 * @returns a usable client
	 */
	async #connectClient(): Promise<RedisClientType> {
		if (this.#redis?.isReady) return this.#redis;

		if (this.#connectPromise) return this.#connectPromise;

		this.#connectPromise = this.#redis.connect().then(() => {
			this.#connectPromise = null;
			return this.#redis;
		});

		return this.#connectPromise;
	}

	/**
	 * Get a value from the cache
	 *
	 * @param key the key to get the result for
	 * @returns the cached value, or `null` if not present
	 */
	async get<T extends RedisJSON>(key: string): Promise<T | null> {
		if (this.#isDev) {
			ddebug(`Retrieving ${key} from in-memory cache`);
			// In dev mode, use memory cache only
			const entry = this.#memoryCache.get(key);

			if (!entry) {
				ddebug("Nothing to retrieve");
				return null;
			}

			// Check if entry is expired
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				ddebug("Value expired, purging and returning null");
				this.#memoryCache.delete(key);
				return null;
			}

			ddebug("Returning found value from in-memory cache");
			return entry.value as T;
		}

		// Production mode
		const entry = this.#memoryCache.get(key);
		if (entry) {
			// Check if entry has expired based on our cached expiresAt
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				this.#memoryCache.delete(key);
				return null;
			}
			return entry.value as T;
		}

		// No cache entry, try Redis
		try {
			await this.#connectClient();
			const value = await this.#redis.json.get(key);
			if (value !== null) {
				// Get TTL only when populating the cache for the first time
				const ttl = await this.#redis.ttl(key);
				const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
				this.#memoryCache.set(key, { value, expiresAt });
			}
			return value as T;
		} catch (error) {
			derror("Redis get error:", error instanceof Error ? error.message : error);
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
	async set<T extends RedisJSON>(key: string, value: T, ttlSeconds?: number) {
		if (this.#isDev) {
			ddebug(`Setting value for ${key} in memory cache`);
			// In dev mode, use memory cache only
			const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
			if (expiresAt) {
				ddebug(`Defining cache for ${key}, expires at ${new Date(expiresAt)}`);
			} else ddebug(`No cache set for ${key}`);
			this.#memoryCache.set(key, { value, expiresAt });
		} else {
			// In production, use both Redis and memory cache
			try {
				await this.#connectClient();
				if (!this.#redis.isReady) await this.#redis.connect();
				await this.#redis.json.set(key, "$", value);
				if (ttlSeconds) await this.#redis.expire(key, ttlSeconds);
				// Mirror in the memory cache
				const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
				this.#memoryCache.set(key, { value, expiresAt });
			} catch (error) {
				derror("Redis set error:", error instanceof Error ? error.message : error);
			}
		}
	}

	/**
	 * Deletes an entry in the cache
	 *
	 * @param key the key to delete
	 * @returns whether the element was actually removed
	 */
	async delete(key: string) {
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
