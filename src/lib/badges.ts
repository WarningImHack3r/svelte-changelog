import { browser } from "$app/environment";
import type { GitHubRelease } from "./server/github-cache";

/**
 * Extract the data from the record parameter which the key matches the argument.
 *
 * @param pkgName the package name to extract releases fo
 * @returns the {@link Promise} of releases
 */
export function getBadgeDataFromRecord<T>(
	record: Record<string, Promise<T | undefined>>,
	pkgName: string
): Promise<T | undefined> {
	const releases = Object.entries(record).find(
		([k]) => k.localeCompare(pkgName, undefined, { sensitivity: "base" }) === 0
	);
	if (!releases) return Promise.resolve(undefined);
	const [, v] = releases;
	return v;
}

/**
 * Filter the releases to exclude those that have already been seen
 *
 * @param pkgName the package name for the releases
 * @param releases the releases to filter
 * @returns the filtered releases
 */
export function getUnvisitedReleases<T extends GitHubRelease>(pkgName: string, releases: T[]): T[] {
	if (!releases.length || !browser) return [];

	const lastVisitedItem = localStorage.getItem(`last-visited-${pkgName}`);
	if (!lastVisitedItem) {
		// by default, if never visited, "new" packages are those newer than a week
		return releases.filter(
			({ created_at, published_at }) =>
				new Date(published_at ?? created_at).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 7
		);
	}

	const lastVisitedDate = new Date(lastVisitedItem);
	return releases.filter(
		({ created_at, published_at }) => new Date(published_at ?? created_at) > lastVisitedDate
	);
}

/**
 * Returns whether the given package is considered new from its releases
 *
 * @param pkgName the package name for the releases
 * @param releases the releases to filter
 * @returns whether the package is considered new
 */
export function isPackageNew<T extends GitHubRelease>(pkgName: string, releases: T[]) {
	if (!browser) return false;
	if (!releases.length) return true;

	const isVisited = !!localStorage.getItem(`last-visited-${pkgName}`);
	if (isVisited) return false;

	const oldestRelease = releases
		.map(({ created_at, published_at }) => new Date(published_at ?? created_at).getTime())
		.toSorted((a, b) => a - b)[0];
	if (!oldestRelease) return true; // same logic than for `.length` above; should never happen for the same reason
	return oldestRelease > Date.now() - 1000 * 60 * 60 * 24 * 7; // new package if its oldest release is newer than a week old
}
