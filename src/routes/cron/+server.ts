import { error, type RequestHandler } from "@sveltejs/kit";
import { CRON_SECRET } from "$env/static/private";
import { svelteGitHubCache } from "$lib/server/github-cache";
import { getRepositories } from "$lib/repositories";

export const GET: RequestHandler = async ({ request }) => {
	if (request.headers.get("Authorization") !== `Bearer ${CRON_SECRET}`) {
		error(401);
	}

	const allRepos = new Set(
		getRepositories().flatMap(([, { repos }]) => repos.map(r => r.repoName))
	);
	for (const repo of allRepos) {
		await svelteGitHubCache.fetchAndCacheReleases(repo);
	}

	return new Response();
};
