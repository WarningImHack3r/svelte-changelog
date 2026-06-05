import { dev } from "$app/environment";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";
import Bottleneck from "bottleneck";
import { Octokit, RequestError } from "octokit";
import { type RedisClientType, type RedisJSON, createClient } from "redis";
import { ddebug as debug, derror as error, dlog as info, dwarn as warn } from "$lib/logging";
import { siteRepoName } from "$lib/properties";
import { createOctokitResponse } from "./data-mock";
import { KVCache } from "./kv";

type OctokitOptions = NonNullable<ConstructorParameters<typeof Octokit>[0]>;

const HEADER_QUOTES_REGEX = /"/g;

/**
 * Create an Octokit client with an extensive configuration for requests handling.
 * It handles retries, rate limits, errors, logging, queueing, and any other good pratice.
 *
 * @param options the additional options to create an Octokit instance with
 * @returns a new, strongly configured Octokit instance
 */
export function createOctokit(options?: OctokitOptions & { redisClient?: RedisClientType }) {
	const { redisClient: client, ...octokitOptions } = options ?? { redisClient: undefined };
	const connection = client ? new Bottleneck.RedisConnection({ client }) : undefined; // TODO(someday): `await connection.disconnect()` on termination
	connection?.on("error", error);

	const octokit = new (Octokit.plugin(retry, throttling))({
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
			},
			connection,
			id: siteRepoName
		},
		retry: {
			doNotRetry: [429]
		},
		...octokitOptions
	});

	const kvClient = client ?? createClient(); // it pains me to import this and do that, but I don't have any better idea for now
	const kv = new KVCache<string>(kvClient, { local: dev });
	const kvJSON = new KVCache<RedisJSON>(kvClient, {
		local: dev,
		redisAccessors: {
			getter: (client, key) => client.json.get(key),
			setter: (client, key, value) => client.json.set(key, "$", value)
		}
	});
	octokit.hook.wrap("request", async (request, options) => {
		// Conditional requests & requests error handling
		const requestPathname = new URL(options.url).pathname;
		try {
			if (options.method === "HEAD" || options.method === "GET") {
				// conditional requests management

				const existingEtag = await kv.get(`headers:etag:${requestPathname}`);
				if (existingEtag) {
					options.headers = { ...options.headers, "if-none-match": `"${existingEtag}"` };
				} else {
					const existingLastModified = await kv.get(`headers:last-modified:${requestPathname}`);
					if (existingLastModified) {
						options.headers = { ...options.headers, "if-modified-since": existingLastModified };
					}
				}

				const response = await request(options);

				if (response.headers.etag) {
					// ETag
					const etagHash = response.headers.etag.replace(HEADER_QUOTES_REGEX, "");
					const isEtagWeak = etagHash.toUpperCase().startsWith("W/");
					if (isEtagWeak && response.headers["accept-ranges"] === "bytes") {
						// can't be cached
						warn(
							`[Middleware] Request ${requestPathname} can't be cached: weak etag with wrong header combination`
						);
						return response;
					}

					await kv.set(`headers:etag:${requestPathname}`, etagHash);
				} else {
					await kv.delete(`headers:etag:${requestPathname}`);
					if (response.headers["last-modified"]) {
						// Last-Modified
						await kv.set(
							`headers:last-modified:${requestPathname}`,
							response.headers["last-modified"]
						);
					} else {
						await kv.delete(`headers:last-modified:${requestPathname}`);
						// can't be cached
						warn(`[Middleware] Request ${requestPathname} can't be cached: no valid header`);
						return response;
					}
				}

				// can be cached
				await kvJSON.set(``, response.data);
				return response;
			}

			// no conditional requests management for unsafe methods (or no Redis)
			return await request(options);
		} catch (error) {
			if (error instanceof RequestError) {
				if (error.status === 304) {
					// "Not Modified", also necessarily HEAD or GET response
					info(`Received Not Modified for ${requestPathname}, returning cached data`);
					const cachedData = await kvJSON.get(``);
					if (!cachedData) {
						// Desync between cached hashes and cached data, shouldn't happen
						warn("Desync between cached data and cached hashes");
						// Fix desync and exceptionally return uncached fresh data
						await Promise.all([
							kv.delete(`headers:etag:${requestPathname}`),
							kv.delete(`headers:last-modified:${requestPathname}`)
						]);
						return await request(options);
					}
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
