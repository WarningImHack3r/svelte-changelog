import { error } from "@sveltejs/kit";
import { discoverer } from "$lib/server/package-discoverer";
import { svelteGitHubCache } from "$lib/server/github-cache";

export async function load({ params }) {
	const { package: pkg } = params;

	// Discover packages, if this one doesn't exist, return 404
	const discovered = await discoverer.getOrDiscover();
	for (const { repoName, packages } of discovered) {
		for (const pkgName of packages) {
			if (pkgName.toLowerCase() === pkg.toLowerCase()) {
				return {
					releases: svelteGitHubCache.getReleases(repoName)
				};
			}
		}
	}

	error(404);
}
