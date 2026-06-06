import type { RedisArgument, RedisClientType } from "redis";
import { ddebug, derror } from "$lib/logging";

export type Options<T> = {
	/**
	 * Whether to use a local cache instead of the Redis connection.
	 * @default false
	 */
	local?: boolean;
	/**
	 * The getter and setter to use with the Redis client.
	 */
	redisAccessors?: {
		/**
		 * The get function to call on the Redis client with the given key
		 *
		 * @param client the current Redis client
		 * @param key the key to use to get from the client
		 * @returns the value returned from calling the chosen getter
		 * @default (client, key) => client.get(key)
		 */
		getter: (client: RedisClientType, key: RedisArgument) => Promise<T | null>;
		/**
		 * The set function to call on the Redis client with the given key and value
		 *
		 * @param client the current Redis client
		 * @param key the key to use to set on the client
		 * @param value the value to set
		 * @returns the value returned from the default set function
		 * @default (client, key, value) => client.set(key, value)
		 */
		setter: (
			client: RedisClientType,
			key: RedisArgument,
			value: T
		) => ReturnType<RedisClientType["set"]>;
	};
};

export class KVCache<T> {
	/** Must NOT be used as-is; only through `#connectClient` */
	readonly #redis: RedisClientType; // TODO: disconnect after usage?

	#getter: NonNullable<Options<unknown>["redisAccessors"]>["getter"]; // TS yells on the fallback value with using `T`, it works fine with `unknown` so let's go for it I guess

	#setter: NonNullable<Options<T>["redisAccessors"]>["setter"];

	readonly #memoryCache: Map<string, { value: unknown; expiresAt: number | null }>;

	readonly #local: boolean;

	#connectPromise: Promise<RedisClientType> | null = null;

	/**
	 * Initialize the cache handler
	 *
	 * @param redis the Redis instance
	 * @param options the options to use
	 */
	constructor(redis: RedisClientType, options?: Options<T>) {
		this.#redis = redis.listenerCount("error") === 0 ? redis.on("error", derror) : redis;
		this.#getter = options?.redisAccessors?.getter ?? ((client, key) => client.get(key));
		this.#setter =
			options?.redisAccessors?.setter ??
			((client, key, value) => client.set(key, value as RedisArgument));
		this.#memoryCache = new Map();
		this.#local = options?.local ?? false;
	}

	/**
	 * Lazily connect the Redis client to the server as needed,
	 * supporting concurrent connections
	 *
	 * @returns a usable client
	 */
	async #connectClient(): Promise<RedisClientType> {
		if (this.#redis?.isReady) return this.#redis;

		if (this.#connectPromise !== null) return this.#connectPromise;

		this.#connectPromise = this.#redis
			.connect()
			.then(() => {
				this.#connectPromise = null;
				return this.#redis;
			})
			.catch(error => {
				this.#connectPromise = null;
				throw error;
			});

		return this.#connectPromise;
	}

	/**
	 * Get a value from the cache
	 *
	 * @param key the key to get the result for
	 * @returns the cached value, or `null` if not present
	 */
	async get<R extends T>(key: string): Promise<R | null> {
		if (this.#local) {
			ddebug(`Retrieving ${key} from in-memory cache`);
			// In local mode, use memory cache only
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
			return entry.value as R;
		}

		// Production mode
		const entry = this.#memoryCache.get(key);
		if (entry) {
			// Check if entry has expired based on our cached expiresAt
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				this.#memoryCache.delete(key);
				return null;
			}
			return entry.value as R;
		}

		// No cache entry, try Redis
		try {
			const client = await this.#connectClient();
			const value = await this.#getter(client, key);
			if (value !== null) {
				// Get TTL only when populating the cache for the first time
				const ttl = await client.ttl(key);
				const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
				this.#memoryCache.set(key, { value, expiresAt });
			}
			return value as R;
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
	async set(key: string, value: T, ttlSeconds?: number) {
		if (this.#local) {
			ddebug(`Setting value for ${key} in memory cache`);
			// In local mode, use memory cache only
			const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
			if (expiresAt) {
				ddebug(`Setting cache for ${key}, expires at ${new Date(expiresAt).toLocaleString()}`);
			} else ddebug(`Setting cache for ${key} with no expiration`);
			this.#memoryCache.set(key, { value, expiresAt });
		} else {
			// In production, use both Redis and memory cache
			try {
				const client = await this.#connectClient();
				await this.#setter(client, key, value);
				if (ttlSeconds) await client.expire(key, ttlSeconds);
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
		// In local mode, we only have the in-memory cache, so we wipe it
		if (this.#local) {
			return this.#memoryCache.delete(key);
		}
		// In production, we clean Redis and then the memory cache if Redis didn't unexpectedly fail
		try {
			const client = await this.#connectClient();
			const deletedCount = await client.del(key);
			this.#memoryCache.delete(key);
			return deletedCount > 0;
		} catch (error) {
			derror("Redis delete error:", error);
			return false;
		}
	}
}
