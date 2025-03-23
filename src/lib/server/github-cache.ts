import { GITHUB_TOKEN, KV_REST_API_TOKEN, KV_REST_API_URL } from "$env/static/private";
import { Redis } from "@upstash/redis";
import { Octokit } from "octokit";

export type GitHubRelease = Awaited<
	ReturnType<InstanceType<typeof Octokit>["rest"]["repos"]["listReleases"]>
>["data"][number];

const PER_PAGE = 100;

/**
 * A fetch layer to reach the GitHub API
 * with an additional caching mechanism.
 */
export class GitHubCache {
	readonly #redis: Redis;
	readonly #octokit: Octokit;

	/**
	 * Creates a new {@link GitHubCache} with the required auth info.
	 *
	 * @param redisUrl the Redis cache URL
	 * @param redisToken the Redis cache token
	 * @param githubToken the GitHub token for uncached API requests
	 * @constructor
	 */
	constructor(redisUrl: string, redisToken: string, githubToken: string) {
		this.#redis = new Redis({
			url: redisUrl,
			token: redisToken
		});

		this.#octokit = new Octokit({
			auth: githubToken
		});
	}

	/**
	 * Generates a Redis key from the passed info.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @returns the pure computed key
	 * @private
	 */
	#getRepoKey(owner: string, repo: string) {
		return `repo:${owner}/${repo}:releases`;
	}

	/**
	 * Get all the releases for a given repository
	 *
	 * @param owner the owner of the GitHub repository to get releases from
	 * @param repo the name of the GitHub repository to get releases from
	 * @returns the releases, either cached or fetched
	 */
	async getReleases(owner: string, repo: string) {
		const cacheKey = this.#getRepoKey(owner, repo);

		const cachedReleases = await this.#redis.json.get<GitHubRelease[]>(cacheKey);
		if (cachedReleases) {
			console.log(`Cache hit for ${cacheKey}`);
			return cachedReleases;
		}

		console.log(`Cache miss for ${cacheKey}, fetching from GitHub API`);

		const { data: releases } = await this.#octokit.rest.repos.listReleases({
			owner,
			repo,
			per_page: PER_PAGE
		});

		await this.#redis.json.set(cacheKey, "$", releases);

		return releases;
	}

	/**
	 * Add the given releases to the repository cache
	 *
	 * @param owner the owner of the cached GitHub repository to add the
	 * new releases into
	 * @param repo the name of the cached GitHub repository to add the
	 * new releases into
	 * @param newReleases the new releases to add to the cache; they will then be
	 * de-duped from the already existing ones, and sorted from most recent to oldest
	 * @returns all the cached releases after the new releases have been applied
	 */
	async addReleases(owner: string, repo: string, newReleases: GitHubRelease[]) {
		const cacheKey = this.#getRepoKey(owner, repo);

		// Get existing releases
		const existingReleases = (await this.#redis.json.get<GitHubRelease[]>(cacheKey)) ?? [];

		// Dedupe them by ID
		const existingIds = new Set(existingReleases.map(release => release.id));
		const uniqueNewReleases = newReleases.filter(release => !existingIds.has(release.id));

		// Merge them all
		const updatedReleases = [...existingReleases, ...uniqueNewReleases];

		// Sort them by most recent
		updatedReleases.sort(
			(a, b) =>
				new Date(b.published_at ?? b.created_at).getTime() -
				new Date(a.published_at ?? a.created_at).getTime()
		);

		await this.#redis.json.set(cacheKey, "$", updatedReleases);

		return updatedReleases;
	}

	/**
	 * Fetch the latest releases for the given repository and add them
	 * to the cache via {@link addReleases}
	 *
	 * @param owner the owner of the GitHub repository to fetch and cache
	 * the releases for
	 * @param repo the name of the GitHub repository to fetch and cache
	 * the releases for
	 * @returns the fetched releases
	 */
	async fetchAndCacheReleases(owner: string, repo: string) {
		const { data: releases } = await this.#octokit.rest.repos.listReleases({
			owner,
			repo,
			per_page: PER_PAGE
		});

		// Ajouter au cache pour le repo
		await this.addReleases(owner, repo, releases);

		return releases;
	}

	/**
	 * Checks if releases are present in the cache for the
	 * given GitHub info
	 *
	 * @param owner the owner of the GitHub repository to check the
	 * existence in the cache for
	 * @param repo the name of the GitHub repository to check the
	 * existence in the cache for
	 * @returns whether the repository is cached or not
	 */
	async exists(owner: string, repo: string) {
		const cacheKey = this.#getRepoKey(owner, repo);
		const result = await this.#redis.exists(cacheKey);
		return result === 1;
	}

	/**
	 * Delete a repository from the cache
	 *
	 * @param owner the owner of the GitHub repository to remove
	 * from the cache
	 * @param repo the name of the GitHub repository to remove
	 * from the cache
	 */
	async deleteEntry(owner: string, repo: string) {
		const cacheKey = this.#getRepoKey(owner, repo);
		await this.#redis.del(cacheKey);
	}
}

/**
 * A {@link GitHubCache} specifically meant for
 * repositories inside the `sveltejs` ownership
 */
export class SvelteGitHubCache {
	readonly #cache: GitHubCache;
	readonly #owner = "sveltejs";

	/**
	 * Creates the cache; see {@link GitHubCache.constructor} for more info
	 *
	 * @constructor
	 */
	constructor(redisUrl: string, redisToken: string, githubToken: string) {
		this.#cache = new GitHubCache(redisUrl, redisToken, githubToken);
	}

	/**
	 * Get the releases; see {@link GitHubCache.getReleases} for more info
	 */
	async getReleases(repo: string) {
		return await this.#cache.getReleases(this.#owner, repo);
	}

	/**
	 * Add new releases to the cache; see {@link GitHubCache.addReleases} for more info
	 */
	async addReleases(repo: string, newReleases: GitHubRelease[]) {
		return await this.#cache.addReleases(this.#owner, repo, newReleases);
	}

	/**
	 * Fetches and adds to the cache; see {@link GitHubCache.fetchAndCacheReleases} for more info
	 */
	async fetchAndCacheReleases(repo: string) {
		return await this.#cache.fetchAndCacheReleases(this.#owner, repo);
	}

	/**
	 * Checks if a cached entry exists; see {@link GitHubCache.exists} for more info
	 */
	async exists(repo: string) {
		return await this.#cache.exists(this.#owner, repo);
	}

	/**
	 * Deletes an entry; see {@link GitHubCache.deleteEntry} for more info
	 */
	async deleteEntry(repo: string) {
		await this.#cache.deleteEntry(this.#owner, repo);
	}

	/**
	 * A convenience getter for the underlying cache
	 */
	get cache() {
		return this.#cache;
	}
}

export const svelteGitHubCache = new SvelteGitHubCache(
	KV_REST_API_URL,
	KV_REST_API_TOKEN,
	GITHUB_TOKEN
);
