import { env } from "$env/dynamic/private";
import { derror, dwarn } from "$lib/logging";

/**
 * Runs a promise in the background without blocking the response.
 *
 * @param promise the Promise triggering the long-running process
 */
export function waitUntil(promise: Promise<unknown>) {
	/*
	 * Mirrors the W3C ExtendableEvent.waitUntil() contract used by Vercel, Netlify,
	 * and Cloudflare Workers. On a long-running Node process, the process never
	 * gets killed mid-flight, so a fire-and-forget is the right primitive —
	 * the Promise just needs to be kept alive and errors surfaced.
	 */
	promise.catch(err => derror("[waitUntil] Background task failed:", err));
}

/**
 * Tags a response with surrogate keys for later targeted cache invalidation,
 * using the most-common `Cache-Tag` header.
 *
 * @param setHeaders the input function to set headers to the response
 * @param tags the surrogate keys to set
 */
export async function tagResponse(
	setHeaders: (headers: Record<string, string>) => void | Promise<void>,
	...tags: string[]
) {
	if (!tags.length) return;
	/*
	 * - Cloudflare / Netlify : Cache-Tag: tag1,tag2
	 * - Fastly               : Surrogate-Key: tag1 tag2   (space-separated)
	 * - Bunny                : CDN-Tag: tag1,tag2
	 */
	await setHeaders({ "Cache-Tag": tags.join(",") });
}

/**
 * Invalidates all CDN-cached responses associated with a surrogate key.
 *
 * @param tag the tag to invalidate
 */
export async function invalidateTag(tag: string) {
	if (!env.CLOUDFLARE_ZONE_ID || !env.CLOUDFLARE_API_TOKEN) {
		dwarn(`[invalidateTag] Skipping purge for tag "${tag}": Cloudflare credentials not configured`);
		return;
	}

	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ tags: [tag] })
		}
	);

	if (!response.ok) {
		const body = await response.text();
		derror(`[invalidateTag] Cloudflare tag purge failed for "${tag}": ${body}`);
	}
}
