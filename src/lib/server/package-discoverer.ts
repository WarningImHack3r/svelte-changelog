import type { Prettify } from "$lib/types";
import { GitHubCache, type GitHubRelease, gitHubCache } from "./github-cache";
import { publicRepos, type Repository } from "$lib/repositories";

export type DiscoveredPackage = Prettify<
	Repository & {
		packages: string[];
	}
>;

export type CategorizedPackage = Prettify<
	Pick<Repository, "category"> & {
		packages: (Omit<Repository, "category"> & { packageName: string })[];
	}
>;

export class PackageDiscoverer {
	readonly #cache: GitHubCache;
	readonly #repos: Repository[] = [];
	#packages: DiscoveredPackage[] = [];

	constructor(cache: GitHubCache, repos: Repository[]) {
		this.#cache = cache;
		this.#repos = repos;
	}

	/**
	 * Discover the packages from the passed releases
	 * and replaces/adds it to the #packages array from
	 * the owner and repo name.
	 *
	 * @param owner the owner of the repository to use to populate the array
	 * @param repoName the name of the repository to use to populate the array
	 * @param releases the releases to populate the array from
	 */
	async discoverReleases(owner: string, repoName: string, releases: GitHubRelease[]) {
		if (!releases.length) return;

		// 1. Find the matching repo data in the existing repos, exit otherwise
		const repo = this.#repos.find(
			({ owner: o, repoName: n, dataFilter }) =>
				o == owner && repoName == n && (dataFilter?.(releases[0]!) ?? true)
		);
		if (!repo) return;
		// 2. Compute the unique packages
		const uniquePackages = [
			...new Set(
				releases
					.filter(release => repo.dataFilter?.(release) ?? true)
					.map(({ tag_name }) => {
						const [name] = repo.metadataFromTag(tag_name);
						return name;
					})
			)
		];
		// 3. Replace or add the value in the array
		for (const [i, { owner: o, repoName: n }] of this.#packages.entries()) {
			if (o === owner && repoName == n && this.#packages[i]) {
				this.#packages[i].packages = uniquePackages;
				return;
			}
		}
		this.#packages.push({ ...repo, packages: uniquePackages });
	}

	/**
	 * A processing-heavy function that discovers all the
	 * packages for the given #repos.
	 * Populates the result into #packages.
	 */
	async discoverAll() {
		this.#packages = await Promise.all(
			this.#repos.map(async repo => {
				const releases = await this.#cache.getReleases(repo.owner, repo.repoName);
				const packages = [
					...new Set(
						releases
							.filter(release => repo.dataFilter?.(release) ?? true)
							.map(({ tag_name }) => {
								const [name] = repo.metadataFromTag(tag_name);
								return name;
							})
					)
				];
				return { ...repo, packages };
			})
		);
	}

	/**
	 * Returns the saved packages if they're not empty,
	 * otherwise calls {@link discoverAll} then returns the
	 * packages.
	 *
	 * @returns all the discovered packages per repo name
	 */
	async getOrDiscover() {
		if (this.#packages.length) {
			return this.#packages;
		}
		await this.discoverAll();
		return this.#packages;
	}

	/**
	 * Returns all packages sorted by categories.
	 * Calls {@link getOrDiscover} under the hood.
	 *
	 * @returns all the discovered packages in a
	 * category-centric data structure
	 */
	async getOrDiscoverCategorized() {
		return (await this.getOrDiscover()).reduce<CategorizedPackage[]>(
			(acc, { category, ...rest }) => {
				const formattedPackages = rest.packages.map(packageName => ({
					...rest,
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
					packages: rest.packages.map(packageName => ({
						...rest,
						packageName
					}))
				});

				return acc;
			},
			[]
		);
	}
}

export const discoverer = new PackageDiscoverer(gitHubCache, publicRepos);
