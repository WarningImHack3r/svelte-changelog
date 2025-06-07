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

		// Production: get TTL for Redis key first
		let ttl: number;
		try {
			ttl = await this.#redis.ttl(key);
		} catch (error) {
			console.error("Redis TTL error:", error);
			return null;
		}

		// Check memory cache first
		const entry = this.#memoryCache.get(key);
		if (entry) {
			if (ttl < 0) {
				// No expiration (-1) or key doesn't exist (-2)
				return entry.value as T;
			}

			// Validate TTL matches what we have in memory
			const remainingTime = entry.expiresAt
				? Math.ceil((entry.expiresAt - Date.now()) / 1000)
				: null;
			// Allow a 1-second difference
			if (remainingTime === null || Math.abs(remainingTime - ttl) <= 1) {
				return entry.value as T;
			}

			// TTL mismatch — purge memory cache
			this.#memoryCache.delete(key);
		}

		// If we reach here, either:
		// 1. Nothing in memory cache
		// 2. Memory cache was invalid
		// Try Redis
		try {
			const value = await this.#redis.json.get<T>(key);
			if (value !== null) {
				// Store in the memory cache with proper expiration
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
