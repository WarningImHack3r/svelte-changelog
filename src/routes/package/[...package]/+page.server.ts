import { error } from "@sveltejs/kit";
import semver from "semver";
import { gitHubCache, type GitHubRelease } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";
import type { Repository } from "$lib/repositories";

export async function load({ params }) {
	const { package: slugPackage } = params;
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	let currentPackage:
		| (Omit<Repository, "dataFilter" | "metadataFromTag" | "changelogContentsReplacer"> &
				Pick<(typeof categorizedPackages)[number]["packages"][number], "pkg">)
		| undefined = undefined;
	const foundVersions = new Set<string>();
	const releases: ({ cleanName: string; cleanVersion: string } & GitHubRelease)[] = [];

	// Discover releases
	console.log("Starting loading releases...");
	for (const { category, packages } of categorizedPackages) {
		for (const { pkg, ...repo } of packages) {
			if (pkg.name.toLowerCase() === slugPackage.toLowerCase()) {
				// 1. Get releases
				const cachedReleases = await gitHubCache.getReleases({ ...repo, category });
				console.log(
					`${cachedReleases.length} releases found for repo ${repo.owner}/${repo.repoName}`
				);

				// 2. Filter out invalid ones
				const validReleases = cachedReleases
					.filter(release => {
						const [name] = repo.metadataFromTag(release.tag_name);
						return (
							(repo.dataFilter?.(release) ?? true) &&
							slugPackage.localeCompare(name, undefined, { sensitivity: "base" }) === 0
						);
					})
					.sort((a, b) => {
						const [, firstVersion] = repo.metadataFromTag(a.tag_name);
						const [, secondVersion] = repo.metadataFromTag(b.tag_name);
						return semver.rcompare(firstVersion, secondVersion);
					});
				console.log("Length after filtering:", validReleases.length);
				// Get the releases matching the slug, or all of them if none
				// (the latter case for repos with no package in names)
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
							`Current newest version "${currentNewestVersion}" doesn't exist or is lesser than ${cleanVersion}, setting ${rest.owner}/${rest.repoName} as final repo`
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
	}

	if (currentPackage) {
		// Return the final sorted results
		return {
			currentPackage,
			releases: releases.toSorted(
				(a, b) =>
					new Date(b.published_at ?? b.created_at).getTime() -
					new Date(a.published_at ?? a.created_at).getTime()
			)
		};
	}

	// If this one doesn't exist, return 404
	error(404);
}
