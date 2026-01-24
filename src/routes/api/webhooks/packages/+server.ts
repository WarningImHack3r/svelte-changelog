import { WEBHOOKS_REPLICATOR_TOKEN } from "$env/static/private";
import { derror, dlog } from "$lib/debug";
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
	if (!result) return new Response(undefined, { status: 422 }); // could not found a repo for this package, likely an unknown package

	// final data handling
	const { repoOwner: owner, repoName: repo } = result;
	dlog(`Received a webhook for ${pkg.name}, invalidating repo ${owner}/${repo}`);
	const deleted = await githubCache.deleteRepoEntry(owner, repo, "releases");
	if (deleted) {
		dlog(`Successfully deleted the entry for ${owner}/${repo}`);
	} else {
		derror(`Failed to delete the entry for ${owner}/${repo}`);
	}
	return new Response();
}
