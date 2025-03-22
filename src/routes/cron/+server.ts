import { error, type RequestHandler } from "@sveltejs/kit";
import { CRON_SECRET } from "$env/static/private";
import { svelteGitHubCache } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";
import { githubRepos } from "$lib/repositories";

export const GET: RequestHandler = async ({ request }) => {
	if (request.headers.get("Authorization") !== `Bearer ${CRON_SECRET}`) {
		error(401);
	}

	await Promise.all(
		Object.entries(githubRepos).flatMap(([owner, repos]) =>
			repos.map(async repo => {
				const releases = await svelteGitHubCache.fetchAndCacheReleases(repo);
				await discoverer.discoverReleases(owner, repo, releases);
			})
		)
	);

	return new Response();
};
