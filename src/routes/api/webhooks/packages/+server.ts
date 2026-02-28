import { WEBHOOKS_REPLICATOR_TOKEN } from "$env/static/private";
import { invalidateByTag, waitUntil } from "@vercel/functions";
import { derror, dlog } from "$lib/logging";
import { githubCache } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";
import type { ReplicatorEvent } from "./types";

export async function GET() {
	const discovered = await discoverer.getOrDiscover();
	const packages = discovered
		.flatMap(({ packages }) => packages)
		.filter(({ registryExcluded }) => !registryExcluded)
		.map(({ name }) => name);
	return Response.json([...new Set(packages)]);
}

/**
 * A list of durations to invalidate the packages tag after
 */
const packagesInvalidationDelaysSec = [10, 15, 30, 120].map(minute => minute * 60);

/**
 * Invalidate the same tag multiple times with multiple delays in-between.
 *
 * @param tag the tag to invalidate
 * @param delays the delays to sequentially invalidate the tag at, in seconds
 * @param signal the signal to cancel the execution
 */
async function invalidateSequentially(tag: string, delays: number[], signal?: AbortSignal) {
	for (const delay of delays) {
		if (signal?.aborted) return;

		await new Promise<void>(resolve => {
			const timeoutId = setTimeout(resolve, delay * 1_000);
			signal?.addEventListener("abort", () => {
				clearTimeout(timeoutId);
				resolve();
			});
		});

		if (signal?.aborted) return;
		await invalidateByTag(tag);
	}
}

let controller: AbortController | null = null;

export async function POST({ request }) {
	// auth
	const auth = request.headers.get("authorization");
	if (!auth) return new Response(undefined, { status: 401 });
	const [, token] = auth.split(" ");
	if (!token) return new Response(undefined, { status: 401 });
	if (token !== WEBHOOKS_REPLICATOR_TOKEN) return new Response(undefined, { status: 403 });

	// initial parsing
	let body: ReplicatorEvent;
	try {
		body = (await request.json()) as ReplicatorEvent;
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	// data validation
	const { event, package: pkg } = body;
	if (event !== "changestream_updated") return new Response(undefined, { status: 415 }); // ignoring other events

	const result = (await discoverer.getOrDiscover()).find(({ packages }) =>
		packages.some(({ name }) => name === pkg.name)
	);
	if (!result) return new Response(undefined, { status: 422 }); // could not find a repo for this package, likely an unknown package

	// final data handling
	const { repoOwner: owner, repoName: repo } = result;
	dlog(`Received a webhook for ${pkg.name}, invalidating repo ${owner}/${repo}`);
	const deleted = await githubCache.deleteRepoEntry(owner, repo, "releases");
	if (deleted) {
		dlog(`Successfully deleted the entry for ${owner}/${repo}`);
	} else {
		derror(`Failed to delete the entry for ${owner}/${repo}`);
	}

	// invalidate all packages
	// invalidate all packages
	await invalidateByTag("all-packages"); // immediate invalidation
	controller?.abort(); // cancel any previous request's invalidation sequence (if they even share memory in the first place)
	controller = new AbortController();
	const currentController = controller;
	request.signal.addEventListener("abort", () => currentController.abort()); // abort if the client somehow aborts the request
	waitUntil(
		invalidateSequentially("all-packages", packagesInvalidationDelaysSec, currentController.signal)
	);

	return new Response();
}
