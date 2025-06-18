import type { Redis } from "@upstash/redis";

export type RedisJson = Parameters<InstanceType<typeof Redis>["json"]["set"]>[2];

export class CacheHandler {
	readonly #redis: Redis;
	readonly #memoryCache: Map<string, { value: unknown; expiresAt: number | null }>;
	readonly #isDev: boolean;

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
	}

	/**
	 * Get a value from the cache
	 *
	 * @param key the key to get the result for
	 * @returns the cached value, or `null` if not present
	 */
	async get<T extends RedisJson>(key: string) {
		if (this.#isDev) {
			console.log(`Retrieving ${key} from in-memory cache`);
			// In dev mode, use memory cache only
			const entry = this.#memoryCache.get(key);

			if (!entry) {
				console.log("Nothing to retrieve");
				return null;
			}

			// Check if entry is expired
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				console.log("Value expired, purging and returning null");
				this.#memoryCache.delete(key);
				return null;
			}

			console.log("Returning found value from in-memory cache");
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
			const value = await this.#redis.json.get<T>(key);
			if (value !== null) {
				// Get TTL only when populating the cache for the first time
				const ttl = await this.#redis.ttl(key);
				const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
				this.#memoryCache.set(key, { value, expiresAt });
			}
			return value;
		} catch (error) {
			console.error("Redis get error:", error);
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
		if (this.#isDev) {
			console.log(`Setting value for ${key} in memory cache`);
			// In dev mode, use memory cache only
			const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
			if (expiresAt) {
				console.log(`Defining cache for ${key}, expires at ${new Date(expiresAt)}`);
			} else console.log(`No cache set for ${key}`);
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
				console.error("Redis set error:", error);
			}
		}
	}
}
