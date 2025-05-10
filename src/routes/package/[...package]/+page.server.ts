import { error } from "@sveltejs/kit";
import { discoverer } from "$lib/server/package-discoverer";
import { getPackageReleases } from "../releases";

export async function load({ params, locals }) {
	const { package: slugPackage } = params;
	// 1. Get all the discovered packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

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
