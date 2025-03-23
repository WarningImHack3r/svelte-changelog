import { discoverer } from "$lib/server/package-discoverer";
import type { Repository } from "$lib/repositories";
import type { Prettify } from "$lib/types";

type OutputItem = Prettify<
	Pick<Repository, "category"> & {
		packages: (Pick<Repository, "owner" | "repoName"> & { packageName: string })[];
	}
>;

export async function load() {
	// Unify the result with identical repos by merging their packages
	const mergedResult = (await discoverer.getOrDiscover()).reduce<OutputItem[]>(
		(acc, { category, owner, repoName, packages }) => {
			const formattedPackages = packages.map(packageName => ({
				owner,
				repoName,
				packageName
			}));

			for (const [i, item] of acc.entries()) {
				if (item.category.slug === category.slug && acc[i]) {
					acc[i].packages.push(...formattedPackages);
					return acc;
				}
			}

			// If the category doesn't exist in the accumulator, create it
			acc.push({
				category,
				packages: packages.map(packageName => ({
					owner,
					repoName,
					packageName
				}))
			});

			return acc;
		},
		[]
	);

	return {
		// Return the processed unified array, sorted
		categorizedPackages: mergedResult.map(res => ({
			...res,
			packages: res.packages.toSorted((a, b) => a.packageName.localeCompare(b.packageName))
		}))
	};
}
