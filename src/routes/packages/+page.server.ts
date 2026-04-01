import { discoverer } from "$lib/server/package-discoverer";
import { getAllPackagesReleases } from "../all-package-releases";

export async function load({ setHeaders, locals }) {
	// Cache management
	setHeaders({
		"Cache-Control": `public, s-maxage=${60 * 60}, stale-while-revalidate`
	});

	// 1. Get all the packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// 2. Use them to get a map of packages to promises of releases
	const allReleases = getAllPackagesReleases(categorizedPackages, locals.posthog);

	// 3. Send all that down to the page's load function
	return { allReleases };
}
