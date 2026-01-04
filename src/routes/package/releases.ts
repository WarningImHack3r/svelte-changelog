import type { PostHog } from "posthog-node";
import semver from "semver";
import { ddebug, dlog, dwarn } from "$lib/debug";
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

	dlog("Starting loading releases...");

	// Step 1: First identify all matching packages and create fetch tasks
	const matchingPackageTasks: {
		category: Repository["category"];
		repo: (typeof allPackages)[number]["packages"][number];
		releasesFetch: Promise<GitHubRelease[]>;
	}[] = [];

	// Collect all matching packages and create fetch tasks
	for (const { category, packages } of allPackages) {
		for (const { pkg, ...repo } of packages) {
			if (pkg.name.localeCompare(packageName, undefined, { sensitivity: "base" }) !== 0) continue;

			matchingPackageTasks.push({
				category,
				repo: { pkg, ...repo },
				// Create a fetch task but don't await it yet
				releasesFetch: githubCache.getReleases({ ...repo, category })
			});
		}
	}

	// Step 2: Process all fetch tasks in parallel
	const taskResults = await Promise.all(
		matchingPackageTasks.map(async ({ category, repo, releasesFetch }) => {
			// Await the individual fetch and process its results
			const cachedReleases = await releasesFetch;

			dlog(`${cachedReleases.length} releases found for repo ${repo.repoOwner}/${repo.repoName}`);

			// Filter out invalid releases and sort them
			const validReleases = cachedReleases
				.map(release => {
					if (!release.tag_name && release.name) return { ...release, tag_name: release.name }; // Mitigate (?) some obscure empty tags scenarios
					return release;
				})
				.filter(release => {
					if (!release.tag_name) {
						posthog?.captureException(new Error("Release with null tag_name"), undefined, {
							packageName,
							repoOwner: repo.repoOwner,
							repoName: repo.repoName,
							...release
						});
						dwarn(`Empty release tag name: ${JSON.stringify(release)}`);
						return false;
					}
					const [name, version] = repo.metadataFromTag(release.tag_name);
					if (semver.valid(version) === null) {
						posthog?.captureException(new Error("Invalid version"), undefined, {
							repo: `${repo.repoOwner}/${repo.repoName}`,
							packageName,
							tag: release.tag_name,
							parsedName: name,
							parsedVersion: version
						});
						dwarn(
							`Invalid version from \`metadataFromTag\` "${version}" gotten from ${release.tag_name}`
						);
						return false;
					}
					return (
						(repo.dataFilter?.(release) ?? true) &&
						repo.pkg.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0
					);
				})
				.sort((a, b) => {
					const [, firstVersion] = repo.metadataFromTag(a.tag_name);
					const [, secondVersion] = repo.metadataFromTag(b.tag_name);
					return semver.rcompare(firstVersion, secondVersion);
				});
			dlog("Final filtered count:", validReleases.length);

			// Return the processed data for further processing
			return {
				category,
				repo,
				validReleases
			};
		})
	);

	// Step 3: Process all results sequentially to maintain consistent result
	for (const { category, repo, validReleases } of taskResults) {
		// For each release, check if it is already found, searching by versions
		const { dataFilter, metadataFromTag, changelogContentsReplacer, ...serializableRepo } = repo;
		for (const release of validReleases) {
			const [cleanName, cleanVersion] = repo.metadataFromTag(release.tag_name);
			ddebug(`Release ${release.tag_name}, extracted version: ${cleanVersion}`);
			if (foundVersions.has(cleanVersion)) continue;

			// If not, add its version to the set and itself to the final version
			const currentNewestVersion = [...foundVersions].sort(semver.rcompare)[0];
			ddebug("Current newest version", currentNewestVersion);
			foundVersions.add(cleanVersion);
			releases.push({ cleanName, cleanVersion, ...release });

			// If it is newer than the newest we got, set this repo as the "final repo"
			if (!currentNewestVersion || semver.gt(cleanVersion, currentNewestVersion)) {
				ddebug(
					`Current newest version "${currentNewestVersion}" doesn't exist or is lesser than ${cleanVersion}, setting ${repo.repoOwner}/${repo.repoName} as final repo`
				);
				currentPackage = {
					category,
					...serializableRepo
				};
			}
		}
		dlog("Done");
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
