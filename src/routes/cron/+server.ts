import { error, type RequestHandler } from "@sveltejs/kit";
import { CRON_SECRET } from "$env/static/private";
import { svelteGitHubCache } from "$lib/server/github-cache";
import { githubRepos } from "$lib/repositories";

export const GET: RequestHandler = async ({ request }) => {
	if (request.headers.get("Authorization") !== `Bearer ${CRON_SECRET}`) {
		error(401);
	}

	for (const repo of githubRepos.sveltejs) {
		await svelteGitHubCache.fetchAndCacheReleases(repo);
	}

	return new Response();
};
