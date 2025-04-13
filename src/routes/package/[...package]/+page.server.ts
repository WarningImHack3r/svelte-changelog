import { error } from "@sveltejs/kit";
import semver from "semver";
import { gitHubCache, type GitHubRelease } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";
import type { Repository } from "$lib/repositories";
import type { Prettify } from "$lib/types";

async function getReleases(
	packageName: string,
	allPackages: Awaited<ReturnType<typeof discoverer.getOrDiscoverCategorized>>
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

async function getAllOtherReleases(exceptPackage: string) {
	const discovery = await discoverer.getOrDiscoverCategorized();
	const otherPackages = discovery.flatMap(({ packages }) => packages);

	const otherReleases = await Promise.all(
		otherPackages.map(async otherPackage => await getReleases(otherPackage.pkg.name, discovery))
	);

	return otherReleases
		.filter(o => o !== undefined)
		.filter(
			({ releasesRepo: releasesPackage }) =>
				releasesPackage.pkg.name.localeCompare(exceptPackage, undefined, {
					sensitivity: "base"
				}) !== 0
		);
}

export async function load({ params }) {
	const { package: slugPackage } = params;
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	const computedReleases = await getReleases(slugPackage, categorizedPackages);

	if (!computedReleases) error(404);

	const { releasesRepo: currentPackage, releases } = computedReleases;
	return {
		currentPackage,
		releases,
		otherReleases: getAllOtherReleases(currentPackage.pkg.name)
	};
}
