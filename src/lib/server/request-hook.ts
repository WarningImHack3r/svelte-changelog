import { dev } from "$app/environment";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";
import { Octokit, RequestError } from "octokit";
import { type RedisClientType, type RedisJSON } from "redis";
import { ddebug as debug, derror as error, dlog as info, dwarn as warn } from "$lib/logging";
import { createOctokitResponse } from "./data-mock";
import { KVCache } from "./kv";

type OctokitOptions = NonNullable<ConstructorParameters<typeof Octokit>[0]>;

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

const kvKeys: Record<"etag" | "last-modified" | "data", (pathname: string) => string> = {
	etag: pathname => `headers:etag:${pathname}`,
	"last-modified": pathname => `headers:last-modified:${pathname}`,
	data: pathname => `stale-data:${pathname}`
};

/**
 * Interpret a pathname by interpolating its brackets values with values
 * from the given parameters record
 *
 * @param pathname the templated pathname to interpolate values in
 * @param parameters the parameters to pick from to inject them in the pathname
 * @returns the interpreted pathname
 *
 * @example
 * ```
 * "/thing/{a}/{b}/c" + { a: "yes" } = "/thing/yes/{b}/c"
 * ```
 */
function interpretPathname(pathname: string, parameters: Record<string, unknown>) {
	return pathname
		.split("/")
		.map(p => {
			const path = decodeURI(p);
			if (!path || (!path.startsWith("{") && !path.endsWith("}"))) return path;
			const name = path.slice(1, -1); // remove brackets
			return parameters[name]?.toString() ?? path;
		})
		.join("/");
}

/**
 * Create a custom Octokit class from the given options
 *
 * @param options the options to create the instance with
 * @returns a custom Octokit class ready to instanciate
 */
function getOctokit(options: OctokitOptions) {
	return Octokit.plugin(retry, throttling).defaults({
		log: { debug, info, warn, error },
		throttle: {
			/**
			 * A callback that gets called when hitting the API rate limit.
			 * The primary rate limit can be summed up as "usage limit in a short period of time".
			 *
			 * @param retryAfter the number of seconds to retry after
			 * @param options the request's metadata
			 * @param octokit the current Octokit instance
			 * @param retryCount the leftover retries available
			 * @returns `true` to retry the request after `retryAfter` seconds, nothing otherwise
			 *
			 * @see {@link https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api#about-primary-rate-limits}
			 */
			onRateLimit: (retryAfter, options, octokit, retryCount) => {
				/* official docs implementation */
				octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);

				if (retryCount < 1) {
					// only retries once
					octokit.log.info(`Retrying after ${retryAfter} seconds!`);
					return true;
				}
			},
			/**
			 * A callback that gets called when hitting the secondary API rate limit.
			 * The secondary rate limit can be summed up as "the one for 'too many requests'".
			 *
			 * @param _retryAfter the number of seconds to retry after
			 * @param options the request's metadata
			 * @param octokit the current Octokit instance
			 * @param _retryCount the leftover retries available
			 *
			 * @see {@link https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api#about-secondary-rate-limits}
			 */
			onSecondaryRateLimit: (_retryAfter, options, octokit, _retryCount) => {
				/* official docs implementation */
				// does not retry, only logs a warning
				octokit.log.warn(`Secondary quota detected for request ${options.method} ${options.url}`);
			}
		},
		retry: {
			doNotRetry: [429]
		},
		...options
	});
}

/**
 * Appends hooks to the given Octokit client for optimizations.
 *
 * @param octokit the Octokit client to hook
 * @param redisClient the optional Redis client to use for remote caching
 * @returns the Octokit client with additional hooks
 */
function hookOctokit(octokit: Octokit, redisClient: RedisClientType) {
	const kv = new KVCache<string>(redisClient, { local: dev });
	const kvJSON = new KVCache<RedisJSON>(redisClient, {
		local: dev,
		redisAccessors: {
			getter: (client, key) => client.json.get(key),
			setter: (client, key, value) => client.json.set(key, "$", value)
		}
	});

	octokit.hook.wrap("request", async (request, options) => {
		// Conditional requests & requests error handling
		const requestUrl = new URL(options.url, "https://api.github.com");
		const cacheKey = `${options.method}:${interpretPathname(requestUrl.pathname, options)}${requestUrl.search}`;
		try {
			if (options.method === "HEAD" || options.method === "GET") {
				// conditional requests management

				const existingEtag = await kv.get(kvKeys.etag(cacheKey));
				if (existingEtag) {
					options.headers = { ...options.headers, "if-none-match": existingEtag };
				} else {
					const existingLastModified = await kv.get(kvKeys["last-modified"](cacheKey));
					if (existingLastModified) {
						options.headers = { ...options.headers, "if-modified-since": existingLastModified };
					} else {
						await kvJSON.delete(kvKeys.data(cacheKey));
					}
				}

				const response = await request(options);

				if (response.headers.etag) {
					// ETag
					const isEtagWeak = response.headers.etag.startsWith("W/"); // W/"abc123"
					if (isEtagWeak && response.headers["accept-ranges"] === "bytes") {
						// can't be cached
						warn(
							`[Middleware] Request ${cacheKey} can't be cached: weak etag with wrong header combination`
						);
						return response;
					}

					await kv.set(kvKeys.etag(cacheKey), response.headers.etag, SEVEN_DAYS_SECONDS);
				} else {
					await kv.delete(kvKeys.etag(cacheKey));
					if (response.headers["last-modified"]) {
						// Last-Modified
						await kv.set(
							kvKeys["last-modified"](cacheKey),
							response.headers["last-modified"],
							SEVEN_DAYS_SECONDS
						);
					} else {
						await kv.delete(kvKeys["last-modified"](cacheKey));
						// can't be cached
						warn(`[Middleware] Request ${cacheKey} can't be cached: no valid header`);
						await kvJSON.delete(kvKeys.data(cacheKey));
						return response;
					}
				}

				// can be cached
				if (options.method === "GET") {
					await kvJSON.set(kvKeys.data(cacheKey), response.data, SEVEN_DAYS_SECONDS);
				}
				return response;
			}

			// no conditional requests management for unsafe methods (or no Redis)
			return await request(options);
		} catch (error) {
			if (error instanceof RequestError) {
				if (error.status === 304) {
					// "Not Modified", also necessarily HEAD or GET response
					info(`Received Not Modified for ${cacheKey}, returning cached data`);
					const cachedData = await kvJSON.get(kvKeys.data(cacheKey));
					if (!cachedData) {
						// Desync between cached hashes and cached data, shouldn't happen
						warn("Desync between cached data and cached hashes");
						// Fix desync and exceptionally return uncached fresh data
						await Promise.all([
							kv.delete(kvKeys.etag(cacheKey)),
							kv.delete(kvKeys["last-modified"](cacheKey))
						]);
						const {
							"if-none-match": _ifNoneMatch,
							"if-modified-since": _ifModifiedSince,
							...headers
						} = options.headers;
						return await request({ ...options, headers });
					}
					await kvJSON.set(kvKeys.data(cacheKey), cachedData, SEVEN_DAYS_SECONDS); // re-set to update TTL back to original
					return createOctokitResponse(cachedData, options.url);
				}

				// gracefully handle errors here?
				throw error;
			} else {
				throw error;
			}
		}
	});

	return octokit;
}

/**
 * Create an Octokit client with an extensive configuration for requests handling.
 * It handles retries, rate limits, errors, logging, queueing, and any other good practice.
 *
 * @param options the additional options to create an Octokit instance with
 * @returns a new, strongly configured Octokit instance
 */
export function createOctokit(options: OctokitOptions & { redisClient: RedisClientType }) {
	const { redisClient, ...opts } = options;
	const octokit = new (getOctokit(opts))();
	return hookOctokit(octokit, redisClient);
}

/**
 * Instanciate a GitHub App with an extensive configuration for requests handling.
 * It handles retries, rate limits, errors, logging, queueing, and any other good practice.
 *
 * @param instanciator the instanciator giving the Octokit class and expecting back
 * a usable instance of it
 * @param options the additional options to create the app with
 * @returns a new, strongly configured Octokit instance
 */
export async function createApp(
	instanciator: (Octo: typeof Octokit) => Octokit | Promise<Octokit>,
	options: { redisClient: RedisClientType }
): Promise<Octokit> {
	const { redisClient } = options;
	const octokit = await instanciator(getOctokit({ redisClient }));
	return hookOctokit(octokit, redisClient);
}
