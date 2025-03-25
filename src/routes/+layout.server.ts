import { discoverer } from "$lib/server/package-discoverer";

export async function load() {
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	return {
		// The displayable data, available to load from clients
		displayablePackages: categorizedPackages.map(res => ({
			...res,
			packages: res.packages
				.map(({ dataFilter, metadataFromTag, changelogContentsReplacer, ...rest }) => rest)
				.toSorted((a, b) => a.packageName.localeCompare(b.packageName))
		}))
	};
}
