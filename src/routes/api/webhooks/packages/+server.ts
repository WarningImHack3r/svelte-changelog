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
	const auth = request.headers.get("authorization");
	if (!auth) return new Response(undefined, { status: 401 });
	const [, token] = auth.split(" ");
	if (!token) return new Response(undefined, { status: 401 });
	if (token !== WEBHOOKS_REPLICATOR_TOKEN) return new Response(undefined, { status: 403 });

	let body: ReplicatorEvent;
	try {
		body = (await request.json()) as ReplicatorEvent;
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	const { event, package: pkg } = body;
	if (event !== "metadata_updated") return new Response(); // ignoring other events

	const result = (await discoverer.getOrDiscover()).find(({ packages }) =>
		packages.some(({ name }) => name === pkg.name)
	);
	if (!result) return new Response(); // always return a success response to avoid the sender to retry

	const { repoOwner: owner, repoName: repo } = result;
	if (!owner || !repo) return new Response();

	dlog(`Received a webhook for ${pkg.name}, invalidating repo ${owner}/${repo}`);
	const deleted = await githubCache.deleteRepoEntry(owner, repo, "releases");
	if (deleted) {
		dlog(`Successfully deleted the entry for ${owner}/${repo}`);
	} else {
		derror(`Failed to delete the entry for ${owner}/${repo}`);
	}
	return new Response();
}
