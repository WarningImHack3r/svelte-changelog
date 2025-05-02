import { discoverer } from "$lib/server/package-discoverer";
import type { PostHog } from "posthog-node";
import { getPackageReleases } from "./releases";

/**
 * Get all the repositories and releases for all the
 * known packages.
 *
 * @param allPackages all the known packages
 * @param posthog the optional PostHog instance
 * @returns a map of package names to their awaitable result
 */
function getAllPackagesReleases(
	allPackages: Awaited<ReturnType<typeof discoverer.getOrDiscoverCategorized>>,
	posthog?: PostHog
) {
	const packages = allPackages.flatMap(({ packages }) => packages);

	return packages.reduce<Record<string, ReturnType<typeof getPackageReleases>>>(
		(acc, { pkg: { name } }) => {
			if (acc[name])
				console.warn(
					`Duplicate package "${name}" while aggregating packages releases; this should not happen!`
				);
			acc[name] = getPackageReleases(name, allPackages, posthog);
			return acc;
		},
		{}
	);
}

/**
 * The goal of this load function is to serve any `[...package]`
 * page by handing it a bunch of promises, so it can await the one
 * it needs. The other ones are for the sidebar badges, so the page
 * doesn't have to re-run the data loading every time we switch from
 * a package to another.
 */
export async function load({ locals }) {
	// 1. Get all the packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// 2. Use them to get a map of packages to promises of releases
	const allReleases = getAllPackagesReleases(categorizedPackages, locals.posthog);

	// 3. Send all that down to the page's load function
	return { allReleases };
}
