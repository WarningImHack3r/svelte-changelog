import { uniq } from "$lib/array";
import { discoverer } from "$lib/server/package-discoverer";

export async function load() {
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	return {
		// The displayable data, available to load from clients
		displayablePackages: categorizedPackages.map(res => ({
			...res,
			packages: uniq(
				res.packages
					.map(({ dataFilter, metadataFromTag, changelogContentsReplacer, ...rest }) => rest)
					.toSorted((a, b) => a.pkg.name.localeCompare(b.pkg.name)),
				item => item.pkg.name
			)
		}))
	};
}
