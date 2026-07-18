import { dirname } from "node:path";
import { uniq } from "#lib/array";
import { dlog } from "#lib/logging";
import { type Repository, publicRepos } from "#lib/repositories";
import type { Prettify } from "#lib/types";
import { GitHubAPI, githubCache } from "./github-api";

export type Package = {
	name: string;
	description?: string;
	deprecated?: string;
	repoSubPath?: string;
	isNpmPackage?: boolean;
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

const DOT_REGEX = /^\.$/;

class PackageDiscoverer {
	readonly #api: GitHubAPI;

	readonly #repos: Repository[] = [];

	readonly #packageDirectoryMap: Record<string, string> = {
		extensions: "svelte-vscode",
		"svelte-migrate": "migrate",
		"svelte-language-server": "language-server",
		"typescript-svelte-plugin": "typescript-plugin",
		"@sveltejs/mcp": "mcp-stdio"
	};

	#packages: DiscoveredPackage[] = [];

	constructor(api: GitHubAPI, repos: Repository[]) {
		this.#api = api;
		this.#repos = repos;
	}

	/**
	 * A processing-heavy function that discovers all the
	 * packages for the repos.
	 * Populates the result into packages.
	 */
	async discoverAll() {
		const repoData = new Map(
			await Promise.all(
				uniq(this.#repos, ({ repoOwner, repoName }) => `${repoOwner}/${repoName}`).map(
					async repo => {
						const [releases, descriptions] = await Promise.all([
							this.#api.getReleases(repo),
							this.#api.getDescriptions(repo.repoOwner, repo.repoName)
						]);
						return [`${repo.repoOwner}/${repo.repoName}`, { releases, descriptions }] as const;
					}
				)
			)
		);

		this.#packages = await Promise.all(
			this.#repos.map(async repo => {
				const { releases = [], descriptions = {} } =
					repoData.get(`${repo.repoOwner}/${repo.repoName}`) ?? {};
				const packages = [
					...new Set(
						releases
							.filter(release => repo.dataFilter?.(release) ?? true)
							.map(({ tag_name }) => {
								const [name] = repo.metadataFromTag(tag_name);
								return name;
							})
							.filter(Boolean)
					)
				];
				dlog(
					`Discovered ${packages.length} packages for ${repo.repoOwner}/${repo.repoName}: ${packages.join(", ")}`
				);
				return {
					...repo,
					packages: await Promise.all(
						packages.map<Promise<Package>>(async pkg => {
							const deprecationStatus = (await this.#api.getPackageDeprecation(pkg)).value;
							const deprecated =
								typeof deprecationStatus === "string" ? deprecationStatus : undefined;
							return {
								name: pkg,
								...(await this.#getRepoData(descriptions, pkg, [repo.repoOwner, repo.repoName])),
								...(deprecated
									? {
											/*
											 * Descriptions of deprecated packages are often wrong as their code might have been deleted:
											 * the regular search would thus fall back to another description, which is often a mismatch.
											 * Avoiding this by explicitely unsetting the description for deprecated packages.
											 */
											description: undefined
										}
									: undefined),
								deprecated,
								isNpmPackage: deprecationStatus !== null
							};
						})
					)
				};
			})
		);
	}

	/**
	 * Get additional package information from its repository data
	 *
	 * @param descriptions the fetched descriptions to pick from
	 * @param packageName the package name to look for
	 * @param repo the owner and name of the repository to fetch as a fallback
	 * @returns the info
	 */
	async #getRepoData(
		descriptions: Record<string, string>,
		packageName: string,
		[owner, repo]: [string, string]
	): Promise<Pick<Package, "description" | "repoSubPath">> {
		const ghDirectory = this.#packageDirectoryMap[packageName] ?? packageName;
		const orderedPaths = [
			...new Set([
				`remote-${packageName}`, // special initial GitHub/npm cached call
				// Monorepos
				`packages/${packageName}/package.json`, // try first at the expected place in case my info is outdated
				`packages/${ghDirectory}/package.json`, // for packages with special and known locations
				`packages/${ghDirectory.substring(ghDirectory.lastIndexOf("/") + 1)}/package.json`, // for scoped packages which don't have a special directory (thus... package names basically?), remove the scope part
				// Not monorepos?
				"package.json" // if nothing matched yet, probably not a monorepo? Or decent fallback
			])
		];
		for (const path of orderedPaths) {
			const description = descriptions[path];
			if (description)
				return {
					description,
					repoSubPath: path.startsWith("remote-")
						? undefined
						: dirname(path).replace(DOT_REGEX, "") /* no dir = "." */ || undefined
				};
		}
		return {
			description: (await this.#api.getPackageDescription(packageName, owner, repo)) ?? undefined
		};
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
