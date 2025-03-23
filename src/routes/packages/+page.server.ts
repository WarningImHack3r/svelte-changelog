import { repositories } from "$lib/repositories";
import { discoverer } from "$lib/server/package-discoverer";

export async function load() {
	// Get all the packages and map them to their associated repo
	const packagesMapping = (await discoverer.getOrDiscover())
		.map(({ repoName, packages }) => {
			const matchingRepoInfo = repositories.find(([, { repos }]) =>
				repos.some(({ repoName: name }) => name === repoName)
			);
			if (!matchingRepoInfo) return null;
			const [, { name: category }] = matchingRepoInfo;
			return {
				category,
				packages: packages
					.map(pkg => ({ name: pkg, repoName }))
					.toSorted((a, b) => a.name.localeCompare(b.name))
			};
		})
		.filter(Boolean);

	// Unify the result with identical repos by merging their packages
	const flattened = packagesMapping.reduce<Record<string, (typeof packagesMapping)[number]>>(
		(acc, { category, packages }) => {
			if (!acc[category]) {
				acc[category] = { category, packages: [] };
			}
			acc[category].packages.push(...packages);
			return acc;
		},
		{}
	);

	return {
		// Return the processed unify array
		packages: Object.values(flattened)
	};
}
