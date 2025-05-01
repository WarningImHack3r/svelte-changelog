import semver from "semver";
import { gitHubCache, type GitHubRelease } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";
import type { Repository } from "$lib/repositories";
import type { Prettify } from "$lib/types";
import type { PostHog } from "posthog-node";

/**
 * Get all the releases for a single package.
 *
 * @param packageName the package to get the releases for
 * @param allPackages all the known packages
 * @param posthog the optional PostHog instance
 * @returns the package's repository alongside its releases, or
 * undefined if not found
 */
async function getPackageReleases(
	packageName: string,
	allPackages: Awaited<ReturnType<typeof discoverer.getOrDiscoverCategorized>>,
	posthog?: PostHog
) {
	let currentPackage:
		| Prettify<
				Omit<Repository, "dataFilter" | "metadataFromTag" | "changelogContentsReplacer"> &
					Pick<(typeof allPackages)[number]["packages"][number], "pkg">
		  >
		| undefined = undefined;
	const foundVersions = new Set<string>();
	const releases: ({ cleanName: string; cleanVersion: string } & GitHubRelease)[] = [];

	// Discover releases
	console.log("Starting loading releases...");
	for (const { category, packages } of allPackages) {
		for (const { pkg, ...repo } of packages) {
			if (pkg.name.localeCompare(packageName, undefined, { sensitivity: "base" }) !== 0) continue;

			// 1. Get releases
			const cachedReleases = await gitHubCache.getReleases({ ...repo, category });
			console.log(
				`${cachedReleases.length} releases found for repo ${repo.owner}/${repo.repoName}`
			);

			// 2. Filter out invalid ones
			const validReleases = cachedReleases
				.filter(release => {
					if (!release.tag_name) {
						posthog?.captureException(new Error("Release with null tag_name"), undefined, {
							release
						});
						console.warn(`Empty release tag name: ${release}`);
						return false;
					}
					const [name] = repo.metadataFromTag(release.tag_name);
					return (
						(repo.dataFilter?.(release) ?? true) &&
						pkg.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0
					);
				})
				.sort((a, b) => {
					const [, firstVersion] = repo.metadataFromTag(a.tag_name);
					const [, secondVersion] = repo.metadataFromTag(b.tag_name);
					return semver.rcompare(firstVersion, secondVersion);
				});
			console.log("Final filtered count:", validReleases.length);

			// 3. For each release, check if it is already found, searching by versions
			const { dataFilter, metadataFromTag, changelogContentsReplacer, ...rest } = repo;
			for (const release of validReleases) {
				if (!release.tag_name) {
					posthog?.captureException(new Error("Release with null tag_name"), undefined, {
						release
					});
					console.warn(`Empty release tag name: ${release}`);
					continue;
				}
				const [cleanName, cleanVersion] = repo.metadataFromTag(release.tag_name);
				console.log(`Release ${release.tag_name}, extracted version: ${cleanVersion}`);
				if (foundVersions.has(cleanVersion)) continue;

				// If not, add its version to the set and itself to the final version
				const currentNewestVersion = [...foundVersions].sort(semver.rcompare)[0];
				console.log("Current newest version", currentNewestVersion);
				foundVersions.add(cleanVersion);
				releases.push({ cleanName, cleanVersion, ...release });

				// If it is newer than the newest we got, set this repo as the "final repo"
				if (!currentNewestVersion || semver.gt(cleanVersion, currentNewestVersion)) {
					console.log(
						`Current newest version "${currentNewestVersion}" doesn't exist or is lesser than ${cleanVersion}, setting ${repo.owner}/${repo.repoName} as final repo`
					);
					currentPackage = {
						category,
						pkg,
						...rest
					};
				}
			}
			console.log("Done");
		}
	}

	return currentPackage
		? {
				releasesRepo: currentPackage,
				releases: releases.toSorted(
					(a, b) =>
						new Date(b.published_at ?? b.created_at).getTime() -
						new Date(a.published_at ?? a.created_at).getTime()
				)
			}
		: undefined;
}

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
