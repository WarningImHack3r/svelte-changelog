import type { Prettify } from "$lib/types";
import { GitHubCache, gitHubCache } from "./github-cache";
import { publicRepos, type Repository } from "$lib/repositories";

type Package = {
	name: string;
	description: string;
};

export type DiscoveredPackage = Prettify<
	Repository & {
		packages: Package[];
	}
>;

export type CategorizedPackage = Prettify<
	Pick<Repository, "category"> & {
		packages: (Omit<Repository, "category"> & { pkg: Package })[];
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
	 * A processing-heavy function that discovers all the
	 * packages for the repos.
	 * Populates the result into packages.
	 */
	async discoverAll() {
		this.#packages = await Promise.all(
			this.#repos.map(async repo => {
				const releases = await this.#cache.getReleases(repo);
				const descriptions = await this.#cache.getDescriptions(repo);
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
				console.log(
					`Discovered ${packages.length} packages for ${repo.owner}/${repo.repoName}: ${packages.join(", ")}`
				);
				return {
					...repo,
					packages: packages.map(pkg => {
						const ghName = this.#gitHubDirectoryFromName(pkg);
						return {
							name: pkg,
							description:
								descriptions[`packages/${ghName}/package.json`] ??
								descriptions[
									`packages/${ghName.substring(ghName.lastIndexOf("/") + 1)}/package.json`
								] ??
								descriptions["package.json"] ??
								""
						};
					})
				};
			})
		);
	}

	/**
	 * Returns the directory on GitHub from the name
	 * of the package.
	 * Useful to retrieve the correct `package.json` file.
	 *
	 * @param name the package name
	 * @returns the directory name in GitHub for that package
	 * @private
	 */
	#gitHubDirectoryFromName(name: string): string {
		switch (name) {
			case "extensions":
				return "svelte-vscode";
			case "sv":
				return "cli";
			case "svelte-migrate":
				return "migrate";
			default:
				return name;
		}
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
				const formattedPackages = rest.packages.map(pkg => ({
					...rest,
					pkg
				}));

				for (const [i, item] of acc.entries()) {
					if (item.category.slug === category.slug) {
						acc[i]?.packages.push(...formattedPackages);
						return acc;
					}
				}

				// If the category doesn't exist in the accumulator, create it
				acc.push({
					category,
					packages: rest.packages.map(pkg => ({
						...rest,
						pkg
					}))
				});

				return acc;
			},
			[]
		);
	}
}

export const discoverer = new PackageDiscoverer(gitHubCache, publicRepos);
