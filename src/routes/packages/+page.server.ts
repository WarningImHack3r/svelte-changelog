import type { Config } from "@sveltejs/adapter-vercel";
import { discoverer } from "$lib/server/package-discoverer";
import { getAllPackagesReleases } from "../all-package-releases";

export const config: Config = {
	isr: {
		expiration: 60 * 60 // 1 hour, to almost never feel when a package is missing after being discovered on the main page
	}
};

export async function load({ locals }) {
	// 1. Get all the packages
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// 2. Use them to get a map of packages to promises of releases
	const allReleases = getAllPackagesReleases(categorizedPackages, locals.posthog);

	// 3. Send all that down to the page's load function
	return { allReleases };
}
