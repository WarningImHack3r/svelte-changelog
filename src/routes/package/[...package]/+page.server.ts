import { error } from "@sveltejs/kit";
import { svelteGitHubCache } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";

export async function load({ params }) {
	const { package: slugPackage } = params;
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// Discover packages, if this one doesn't exist, return 404
	for (const { category, packages } of categorizedPackages) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const { dataFilter, metadataFromTag, changelogContentsReplacer, ...rest } of packages) {
			if (rest.packageName.toLowerCase() === slugPackage.toLowerCase()) {
				return {
					currentPackage: {
						category,
						...rest
					},
					releases: svelteGitHubCache.getReleases(rest.repoName).then(releases => {
						const dataFiltered = releases.filter(release => dataFilter?.(release) ?? true);
						const pkgTagFiltered = dataFiltered.filter(({ tag_name }) =>
							tag_name.includes(slugPackage)
						);
						return pkgTagFiltered.length ? pkgTagFiltered : dataFiltered;
					})
				};
			}
		}
	}

	error(404);
}
