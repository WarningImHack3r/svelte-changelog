import semver from "semver";
import { error } from "@sveltejs/kit";
import { gitHubCache } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";

export async function load({ params }) {
	const { package: slugPackage } = params;
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// Discover packages, if this one doesn't exist, return 404
	for (const { category, packages } of categorizedPackages) {
		for (const fullPackage of packages) {
			const { packageName, ...repo } = fullPackage;
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { dataFilter, metadataFromTag, changelogContentsReplacer, ...rest } = repo;
			if (packageName.toLowerCase() === slugPackage.toLowerCase()) {
				return {
					currentPackage: {
						category,
						packageName,
						...rest
					},
					releases: gitHubCache.getReleases({ ...repo, category }).then(releases => {
						const dataFiltered = releases
							.filter(release => dataFilter?.(release) ?? true)
							.sort((a, b) => {
								const [, firstVersion] = repo.metadataFromTag(a.tag_name);
								const [, secondVersion] = repo.metadataFromTag(b.tag_name);
								return semver.rcompare(firstVersion, secondVersion);
							});
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
