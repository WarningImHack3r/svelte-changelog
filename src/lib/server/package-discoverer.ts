import { GitHubCache, svelteGitHubCache } from "./github-cache";
import { transformationRepos } from "$lib/repositories";

export class PackageDiscoverer {
	readonly #cache: GitHubCache;
	readonly #repos: { owner: string; repoName: string; tagToName: (name: string) => string }[];
	#packages: { owner: string; repoName: string; packages: string[] }[] = [];

	constructor(
		cache: GitHubCache,
		repos: { owner: string; repoName: string; tagToName: (name: string) => string }[]
	) {
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
	async discoverReleases(
		owner: string,
		repoName: string,
		releases: Awaited<ReturnType<InstanceType<typeof GitHubCache>["getReleases"]>>
	) {
		// 1. Find the transformation function in the existing repos, exit otherwise
		const repo = this.#repos.find(({ owner: o, repoName: n }) => o == owner && repoName == n);
		if (!repo) return;
		// 2. Compute the unique packages
		const uniquePackages = [...new Set(releases.map(({ tag_name }) => repo.tagToName(tag_name)))];
		// 3. Replace or add the value in the array
		for (const [i, { owner: o, repoName: n }] of this.#packages.entries()) {
			if (o === owner && repoName == n) {
				this.#packages[i]!.packages = uniquePackages;
				return;
			}
		}
		this.#packages.push({ owner, repoName, packages: uniquePackages });
	}

	/**
	 * A processing-heavy function that discovers all the
	 * packages for the given #repos.
	 * Populates the result into #packages.
	 */
	async discoverAll() {
		this.#packages = await Promise.all(
			this.#repos.map(async ({ owner, repoName, tagToName }) => {
				const releases = await this.#cache.getReleases(owner, repoName);
				const packages = [...new Set(releases.map(({ tag_name }) => tagToName(tag_name)))];
				return { owner, repoName, packages };
			})
		);
	}

	/**
	 * Returns the saved #packages if they're not empty,
	 * otherwise calls {@link discoverAll} then returns the
	 * #packages.
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
}

export const discoverer = new PackageDiscoverer(svelteGitHubCache.cache, transformationRepos);
