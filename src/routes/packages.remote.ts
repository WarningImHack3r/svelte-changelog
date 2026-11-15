import { query } from "$app/server";
import { uniq } from "#lib/array.js";
import { discoverer } from "#lib/server/package-discoverer.js";

export const getDisplayablePackages = query(async () => {
	const categorizedPackages = await discoverer.getOrDiscoverCategorized();

	// The displayable data, available to load from clients
	return categorizedPackages.map(res => ({
		...res,
		packages: uniq(
			res.packages
				.map(({ dataFilter, metadataFromTag, changelogContentsReplacer, ...rest }) => rest)
				.toSorted((a, b) => a.pkg.name.localeCompare(b.pkg.name)),
			item => item.pkg.name
		)
	}));
});
