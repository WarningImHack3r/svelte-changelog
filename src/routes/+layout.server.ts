import { discoverer } from "$lib/server/package-discoverer";

export async function load() {
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	return {
		// The displayable data, available to load from clients
		displayablePackages: categorizedPackages
			.map(res => ({
				...res,
				packages: res.packages.map(
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					({ dataFilter, metadataFromTag, changelogContentsReplacer, ...rest }) => rest
				)
			}))
			// Sort the packages by name
			.map(res => ({
				...res,
				packages: res.packages.toSorted((a, b) => a.packageName.localeCompare(b.packageName))
			}))
	};
}
