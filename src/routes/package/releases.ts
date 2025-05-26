import type { PostHog } from "posthog-node";
import semver from "semver";
import type { Repository } from "$lib/repositories";
import { type GitHubRelease, githubCache } from "$lib/server/github-cache";
import type { discoverer } from "$lib/server/package-discoverer";
import type { Prettify } from "$lib/types";

/**
 * Get all the releases for a single package.
 *
 * @param packageName the package to get the releases for
 * @param allPackages all the known packages
 * @param posthog the optional PostHog instance
 * @returns the package's repository alongside its releases, or
 * undefined if not found
 */
export async function getPackageReleases(
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
			const cachedReleases = await githubCache.getReleases({ ...repo, category });
			console.log(
				`${cachedReleases.length} releases found for repo ${repo.repoOwner}/${repo.repoName}`
			);

			// 2. Filter out invalid ones
			const validReleases = cachedReleases
				.filter(release => {
					if (!release.tag_name) {
						posthog?.captureException(new Error("Release with null tag_name"), undefined, {
							packageName,
							repoOwner: repo.repoOwner,
							repoName: repo.repoName,
							...release
						});
						console.warn(`Empty release tag name: ${JSON.stringify(release)}`);
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
						`Current newest version "${currentNewestVersion}" doesn't exist or is lesser than ${cleanVersion}, setting ${repo.repoOwner}/${repo.repoName} as final repo`
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
 * Get all the releases from all the packages.
 *
 * @param allPackages all the known packages
 * @param posthog the optional PostHog instance
 * @return a list of all the package releases
 */
export async function getAllPackagesReleases(
	allPackages: Awaited<ReturnType<typeof discoverer.getOrDiscoverCategorized>>,
	posthog?: PostHog
) {
	const packages = allPackages.flatMap(({ packages }) => packages);

	const awaitedResult = await Promise.all(
		packages.map(async ({ pkg }) => getPackageReleases(pkg.name, allPackages, posthog))
	);

	return awaitedResult
		.filter(r => r !== undefined)
		.flatMap(r => r.releases)
		.toSorted(
			(a, b) =>
				new Date(b.published_at ?? b.created_at).getTime() -
				new Date(a.published_at ?? a.created_at).getTime()
		);
}
