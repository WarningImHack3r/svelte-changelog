import { tagResponse } from "$lib/server/cache";
import { discoverer } from "$lib/server/package-discoverer";
import { getAllPackagesReleases } from "../all-package-releases";

/**
 * The goal of this load function is to serve any `[...package]`
 * page by handing it a bunch of promises, so it can await the one
 * it needs. The other ones are for the sidebar badges, so the page
 * doesn't have to re-run the data loading every time we switch from
 * a package to another.
 */
export async function load({ setHeaders, locals }) {
	// Cache management
	await tagResponse(setHeaders, "all-packages");

	// 1. Get all the packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// 2. Use them to get a map of packages to promises of releases
	const allReleases = getAllPackagesReleases(categorizedPackages, locals.posthog);

	// 3. Send all that down to the page's load function
	return { allReleases };
}
