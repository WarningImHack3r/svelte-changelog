import type { PostHog } from "posthog-node";
import { discoverer } from "$lib/server/package-discoverer";
import { getPackageReleases } from "./package/releases";

/**
 * Get all the repositories and releases for all the
 * known packages.
 *
 * @param allPackages all the known packages
 * @param posthog the optional PostHog instance
 * @returns a map of package names to their awaitable result
 */
export function getAllPackagesReleases(
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
