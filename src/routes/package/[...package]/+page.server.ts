import { error } from "@sveltejs/kit";
import { discoverer } from "$lib/server/package-discoverer";
import { ALL_SLUG } from "$lib/types";
import { getAllPackagesReleases, getPackageReleases } from "../releases";

export async function load({ params, locals }) {
	const { package: slugPackage } = params;
	// 1. Get all the discovered packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// 1.5. Return a set for all the packages
	if (slugPackage.toLowerCase() === ALL_SLUG) {
		return {
			currentPackage: {
				category: {
					slug: ALL_SLUG,
					name: "All"
				},
				repoOwner: "",
				repoName: "",
				pkg: {
					name: "All packages",
					description: "All the packages of this site."
				}
			} satisfies NonNullable<Awaited<ReturnType<typeof getPackageReleases>>>["releasesRepo"],
			releases: await getAllPackagesReleases(categorizedPackages, locals.posthog)
		};
	}

	// 2. Get the releases and package info
	const packageReleases = await getPackageReleases(
		slugPackage,
		categorizedPackages,
		locals.posthog
	);
	if (!packageReleases) error(404);

	// 3. Return the data
	const { releasesRepo: currentPackage, releases } = packageReleases;
	return { currentPackage, releases };
}
