import { getRequestEvent, query } from "$app/server";
import { discoverer } from "$lib/server/package-discoverer";
import { getAllPackagesReleases } from "./all-package-releases";

export const getAllReleases = query(async () => {
	const { locals } = getRequestEvent();

	// 1. Get all the packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// 2. Use them to get a map of packages to promises of releases
	return getAllPackagesReleases(categorizedPackages, locals.posthog);
});
