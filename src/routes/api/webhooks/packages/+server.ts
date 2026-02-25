import { resolve } from "$app/paths";
import { env } from "$env/dynamic/private";
import { WEBHOOKS_REPLICATOR_TOKEN } from "$env/static/private";
import { ddebug, derror, dlog } from "$lib/logging";
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

export async function POST({ request, fetch }) {
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

	if (env.PRERENDER_BYPASS_TOKEN) {
		// invalidate the relevant route
		try {
			const res = await fetch(
				resolve("/package/[...package]", {
					package: pkg.name
				}),
				{
					method: "HEAD",
					headers: {
						"x-prerender-revalidate": env.PRERENDER_BYPASS_TOKEN
					}
				}
			);
			if (!res.ok) {
				throw new Error(`HTTP code ${res.status}: ${(await res.text()) || "no further info"}`);
			}
			ddebug(`Successfully invalidated cache for ${pkg.name} from webhook`);
		} catch (err) {
			derror(`Failed to invalidate cache for ${pkg.name} from webhook:`, err);
		}
	}

	return new Response();
}
