import { json } from "@sveltejs/kit";
import { derror, dlog } from "$lib/debug";
import { githubCache } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";
import type { ReplicatorEvent } from "./types";

export async function GET() {
	const discovered = await discoverer.getOrDiscover();
	const packages = discovered.flatMap(({ packages }) => packages).map(({ name }) => name);
	return json([...new Set(packages)]);
}

export async function POST({ request }) {
	let event: ReplicatorEvent;
	try {
		event = (await request.json()) as ReplicatorEvent;
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}
	const { package: pkg } = event;
	const ghUrl = pkg.repository?.url.replace(/\.git$/, "");
	if (!ghUrl) return new Response(); // always return a success response to avoid the sender to retry
	const repoFullName = new URL(ghUrl).pathname.slice(1);
	const [owner, repo] = repoFullName.split("/");
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
