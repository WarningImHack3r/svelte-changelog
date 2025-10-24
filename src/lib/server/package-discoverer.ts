import { dlog } from "$lib/debug";
import { type Repository, publicRepos } from "$lib/repositories";
import type { Prettify } from "$lib/types";
import { GitHubCache, githubCache } from "./github-cache";

type Package = {
	name: string;
	description: string;
	deprecated?: string;
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
				const descriptions = await this.#cache.getDescriptions(repo.repoOwner, repo.repoName);
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
				dlog(
					`Discovered ${packages.length} packages for ${repo.repoOwner}/${repo.repoName}: ${packages.join(", ")}`
				);
				return {
					...repo,
					packages: await Promise.all(
						packages.map(async (pkg): Promise<Package> => {
							const ghName = this.#gitHubDirectoryFromName(pkg);
							const deprecated = (await this.#cache.getPackageDeprecation(pkg)).value || undefined;
							return {
								name: pkg,
								description: deprecated
									? "" // descriptions of deprecated packages are often wrong as their code might be deleted,
									: // thus falling back to a higher hierarchy description, often a mismatch
										(descriptions[`packages/${ghName}/package.json`] ??
										descriptions[
											`packages/${ghName.substring(ghName.lastIndexOf("/") + 1)}/package.json`
										] ??
										descriptions["package.json"] ??
										""),
								deprecated
							};
						})
					)
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

export const discoverer = new PackageDiscoverer(githubCache, publicRepos);
