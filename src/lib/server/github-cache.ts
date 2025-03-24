import { GITHUB_TOKEN, KV_REST_API_TOKEN, KV_REST_API_URL } from "$env/static/private";
import { Redis } from "@upstash/redis";
import { Octokit } from "octokit";
import type { Repository } from "$lib/repositories";
import parseChangelog from "$lib/changelog-parser";

export type GitHubRelease = Awaited<
	ReturnType<InstanceType<typeof Octokit>["rest"]["repos"]["listReleases"]>
>["data"][number];

/**
 * The maximum items amount to get per-page
 * when fetching from GitHub API.
 * Capped at 100.
 *
 * (Lowercased despite being a constant for
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#property_definitions|Shorthand property names}
 * usage purposes)
 *
 * @see {@link https://docs.github.com/en/rest/releases/releases#list-releases|GitHub Docs}
 */
const per_page = 100;

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
	 * @param repository the repository to get the releases for
	 * @returns the releases, either cached or fetched
	 */
	async getReleases(repository: Repository) {
		const cacheKey = this.#getRepoKey(repository.owner, repository.repoName);

		const cachedReleases = await this.#redis.json.get<GitHubRelease[]>(cacheKey);
		if (cachedReleases) {
			console.log(`Cache hit for ${cacheKey}`);
			return cachedReleases;
		}

		console.log(`Cache miss for ${cacheKey}, fetching from GitHub API`);

		const releases = await this.#fetchReleases(repository);

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
		const existingIds = new Set(existingReleases.map(({ id }) => id));
		const uniqueNewReleases = newReleases.filter(({ id }) => !existingIds.has(id));

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
			per_page
		});

		// Ajouter au cache pour le repo
		await this.addReleases(owner, repo, releases);

		return releases;
	}

	/**
	 * A utility method to fetch the releases based on the
	 * mode we want to use to get them
	 *
	 * @param repository the repository to fetch the releases for
	 * @returns the fetched releases
	 * @private
	 */
	async #fetchReleases(repository: Repository): Promise<GitHubRelease[]> {
		const { owner, repoName: repo, changesMode, changelogContentsReplacer } = repository;
		if (changesMode === "releases" || !changesMode) {
			const { data: releases } = await this.#octokit.rest.repos.listReleases({
				owner,
				repo,
				per_page
			});
			return releases;
		}

		// Changelog mode: we'll need to get the tags and re-build releases from them

		// 1. Fetch tags
		const { data: tags } = await this.#octokit.rest.repos.listTags({
			owner,
			repo,
			per_page
		});

		// 2. Fetch changelog
		const { data: changelogResult } = await this.#octokit.rest.repos.getContent({
			owner,
			repo,
			ref:
				owner === "sveltejs" &&
				repo === "prettier-plugin-svelte" && // this repo is a bit of a mess
				tags[0] &&
				repository.metadataFromTag(tags[0].name)[1].startsWith("3")
					? "version-3" // a temporary fix to get the changelog from the right branch while v4 isn't out yet
					: undefined,
			path: "CHANGELOG.md"
		});

		if (!("content" in changelogResult)) return []; // filter out empty or multiple results
		const { content, encoding, type } = changelogResult;
		if (type !== "file" || !content) return []; // filter out directories and empty files
		const changelogFileContents =
			encoding === "base64" ? Buffer.from(content, "base64").toString() : content;
		// Actually parse the changelog file
		const { versions } = await parseChangelog(
			changelogContentsReplacer?.(changelogFileContents) ?? changelogFileContents
		);

		/**
		 * Returns a simili-hash for local ID creation purposes
		 *
		 * @param input the input string
		 * @returns a (hopefully unique) and pure hashcode
		 */
		function simpleHash(input: string) {
			return Math.abs(
				input.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) & 0xffffffff, 0)
			);
		}

		// 3. Return the recreated releases
		return await Promise.all(
			tags.map(
				async (
					{ name: tag_name, commit: { sha }, zipball_url, tarball_url, node_id },
					tagIndex
				) => {
					const {
						data: { author, committer }
					} = await this.#octokit.rest.git.getCommit({ owner, repo, commit_sha: sha });
					const [, cleanVersion] = repository.metadataFromTag(tag_name);
					const changelogVersion = versions.find(
						({ version }) => !!version?.includes(cleanVersion)
					);
					return {
						url: "",
						html_url: `https://github.com/${owner}/${repo}/releases/tag/${tag_name}`,
						assets_url: "",
						upload_url: "",
						tarball_url,
						zipball_url,
						id: simpleHash(`${owner}/${repo}`) + tagIndex,
						node_id,
						tag_name,
						target_commitish: "main",
						name: `${repo}@${cleanVersion}`,
						body: changelogVersion?.body ?? "_No changelog provided._",
						draft: false,
						prerelease: tag_name.includes("-"),
						created_at: committer.date,
						published_at: null,
						author: {
							name: author.name,
							login: "",
							email: author.email,
							id: 0,
							node_id: "",
							avatar_url: "",
							gravatar_id: null,
							url: "",
							html_url: "",
							followers_url: "",
							following_url: "",
							gists_url: "",
							starred_url: "",
							subscriptions_url: "",
							organizations_url: "",
							repos_url: "",
							events_url: "",
							received_events_url: "",
							type: "",
							site_admin: false
						},
						assets: []
					} satisfies GitHubRelease;
				}
			)
		);
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

export const gitHubCache = new GitHubCache(KV_REST_API_URL, KV_REST_API_TOKEN, GITHUB_TOKEN);
