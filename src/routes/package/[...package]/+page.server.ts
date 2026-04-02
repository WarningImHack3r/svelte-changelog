import { error } from "@sveltejs/kit";
import { siteName } from "$lib/properties";
import { tagResponse } from "$lib/server/cache";
import { discoverer } from "$lib/server/package-discoverer";
import { ALL_SLUG } from "$lib/types";
import { getAllPackagesReleases, getPackageReleases } from "../releases";

export async function load({ params: { package: slugPackage }, setHeaders, locals }) {
	// 1. Get all the discovered packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// 1.5. Return a set for all the packages
	if (slugPackage.localeCompare(ALL_SLUG, undefined, { sensitivity: "base" }) === 0) {
		return {
			currentPackage: {
				category: {
					slug: ALL_SLUG,
					name: "All"
				},
				repoOwner: "",
				repoName: "",
				pkg: {
					name: "All releases",
					description: `All the releases of the packages listed on ${siteName}`
				}
			} satisfies NonNullable<Awaited<ReturnType<typeof getPackageReleases>>>["releasesRepo"],
			releases: await getAllPackagesReleases(categorizedPackages, locals.posthog)
		};
	}

	// 1.75. Early check to ensure the package exists
	const knownPackages = categorizedPackages
		.flatMap(({ packages }) => packages)
		.map(({ pkg }) => pkg.name);
	const exists = knownPackages.some(
		knownPackage =>
			knownPackage.localeCompare(slugPackage, undefined, { sensitivity: "base" }) === 0
	);
	if (!exists) error(404, `Unknown package "${slugPackage}"`);

	// 2. Get the releases and package info
	const packageReleases = await getPackageReleases(
		slugPackage,
		categorizedPackages,
		locals.posthog
	);
	if (!packageReleases) error(404, `Unable to retrieve releases for ${slugPackage}`);

	// Cache management
	await tagResponse(setHeaders, "all-packages", `package-${slugPackage.toLowerCase()}`); // no need to add it for `/all` as we won't invalidate it manually (for now)

	// 3. Return the data
	const { releasesRepo: currentPackage, releases } = packageReleases;
	return { currentPackage, releases };
}
