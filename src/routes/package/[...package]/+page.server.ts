import { error } from "@sveltejs/kit";

export async function load({ params, parent }) {
	const { package: slugPackage } = params;
	// 1. Get the promise array from the layout
	const { allReleases } = await parent();

	// 2. Find the package slug in there
	const matchingEntry = Object.entries(allReleases).find(
		([p]) => p.localeCompare(slugPackage, undefined, { sensitivity: "base" }) === 0
	);
	if (!matchingEntry) error(404);

	// 3. Try to await the releases
	const [, matchingPromise] = matchingEntry;
	const computedReleases = await matchingPromise;
	if (!computedReleases) error(404);

	// 4. Return the right data
	const { releasesRepo: currentPackage, releases } = computedReleases;
	return { currentPackage, releases };
}
