import { GITHUB_TOKEN, KV_REST_API_TOKEN, KV_REST_API_URL } from "$env/static/private";
import { Redis } from "@upstash/redis";
import { Octokit } from "octokit";
import type { Repository as GQLRepository } from "@octokit/graphql-schema";
import type { Repository } from "$lib/repositories";
import type { Issues, Pulls } from "$lib/types";
import parseChangelog from "$lib/changelog-parser";

/**
 * A strict version of Extract.
 *
 * @see {@link https://github.com/sindresorhus/type-fest/issues/222#issuecomment-940597759|Original implementation}
 */
type ExtractStrict<T, U extends T> = U;

export type GitHubRelease = Awaited<
	ReturnType<InstanceType<typeof Octokit>["rest"]["repos"]["listReleases"]>
>["data"][number];

type KeyType = "releases" | "descriptions" | "issue" | "pr";

export type ItemDetails = {
	comments: Awaited<ReturnType<Issues["listComments"]>>["data"];
};

export type IssueDetails = ItemDetails & {
	info: Awaited<ReturnType<Issues["get"]>>["data"];
	linkedPrs: LinkedItem[];
};

export type PullRequestDetails = ItemDetails & {
	info: Awaited<ReturnType<Pulls["get"]>>["data"];
	commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"];
	files: Awaited<ReturnType<Pulls["listFiles"]>>["data"];
	linkedIssues: LinkedItem[];
};

export type LinkedItem = {
	number: number;
	title: string;
	author?: {
		avatarUrl: string;
		login: string;
	} | null;
	createdAt: string;
	body: string;
};

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
 * The TTL of the cached releases, in seconds.
 */
const RELEASES_TTL = 60 * 15; // 15 min
/**
 * The TTL of the full issue/pr details, in seconds.
 */
const FULL_DETAILS_TTL = 60 * 60 * 2; // 2 hours
/**
 * The TTL of the cached descriptions, in seconds.
 */
const DESCRIPTIONS_TTL = 60 * 60 * 24 * 10; // 10 days

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
	 * @param type the kind of cache to use
	 * @param args the optional additional values to append
	 * at the end of the key; every element will be interpolated
	 * in a string
	 * @returns the pure computed key
	 * @private
	 */
	#getRepoKey(owner: string, repo: string, type: KeyType, ...args: unknown[]) {
		const strArgs = args.map(a => `:${a}`);
		return `repo:${owner}/${repo}:${type}${strArgs}`;
	}

	/**
	 * Get the item (issue or pr) with the given information.
	 * Return the appropriate value if the type is defined, or
	 * try to coerce it otherwise.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @param id the issue/pr number
	 * @param type the item to fetch
	 * @returns the matching or specified item, or `null` if not found
	 */
	async getItemDetails(
		owner: string,
		repo: string,
		id: number,
		type: ExtractStrict<KeyType, "issue" | "pr"> | undefined = undefined
	) {
		// Known type we assume the existence of
		switch (type) {
			case "issue":
				return await this.getIssueDetails(owner, repo, id);
			case "pr":
				return await this.getPullRequestDetails(owner, repo, id);
		}

		// Unknown type, try to find or null otherwise
		try {
			return await this.getPullRequestDetails(owner, repo, id);
		} catch (err: unknown) {
			console.error(`Error trying to get PR details for ${owner}/${repo}: ${err}`);
		}

		try {
			// comes last because issues will also resolve for prs
			return await this.getIssueDetails(owner, repo, id);
		} catch (err: unknown) {
			console.error(`Error trying to get issue details for ${owner}/${repo}: ${err}`);
		}

		return null;
	}

	/**
	 * Get the issue from the specified info.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @param id the issue number
	 * @returns the matching issue
	 * @throws Error if the issue is not found
	 */
	async getIssueDetails(owner: string, repo: string, id: number) {
		const cacheKey = this.#getRepoKey(owner, repo, "issue", id);

		const cachedDetails = await this.#redis.json.get<IssueDetails>(cacheKey);
		if (cachedDetails) {
			console.log(`Cache hit for issue details for ${cacheKey}`);
			return cachedDetails;
		}

		console.log(`Cache miss for issue details for ${cacheKey}, fetching from the GitHub API`);

		const [{ data: info }, { data: comments }, linkedPrs] = await Promise.all([
			this.#octokit.rest.issues.get({ owner, repo, issue_number: id }),
			this.#octokit.rest.issues.listComments({ owner, repo, issue_number: id }),
			this.#getLinkedPullRequests(owner, repo, id)
		]);

		const details: IssueDetails = { info, comments, linkedPrs };

		await this.#redis.json.set(cacheKey, "$", details);
		await this.#redis.expire(cacheKey, FULL_DETAILS_TTL);

		return details;
	}

	/**
	 * Get the pull request from the specified info.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @param id the PR number
	 * @returns the matching pull request
	 * @throws Error if the PR is not found
	 */
	async getPullRequestDetails(owner: string, repo: string, id: number) {
		const cacheKey = this.#getRepoKey(owner, repo, "pr", id);

		const cachedDetails = await this.#redis.json.get<PullRequestDetails>(cacheKey);
		if (cachedDetails) {
			console.log(`Cache hit for PR details for ${cacheKey}`);
			return cachedDetails;
		}

		console.log(`Cache miss for PR details for ${id}, fetching from the GitHub API`);

		const [{ data: info }, { data: comments }, { data: commits }, { data: files }, linkedIssues] =
			await Promise.all([
				this.#octokit.rest.pulls.get({ owner, repo, pull_number: id }),
				this.#octokit.rest.issues.listComments({ owner, repo, issue_number: id }),
				this.#octokit.rest.pulls.listCommits({ owner, repo, pull_number: id }),
				this.#octokit.rest.pulls.listFiles({ owner, repo, pull_number: id }),
				this.#getLinkedIssues(owner, repo, id)
			]);

		const details: PullRequestDetails = { info, comments, commits, files, linkedIssues };

		// Cache the result
		await this.#redis.json.set(cacheKey, "$", details);
		await this.#redis.expire(cacheKey, FULL_DETAILS_TTL);

		return details;
	}

	/**
	 * Get the pull requests linked to the given issue number.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @param issueNumber the issue number
	 * @returns the linked pull requests
	 * @private
	 */
	async #getLinkedPullRequests(owner: string, repo: string, issueNumber: number) {
		const result = await this.#octokit.graphql<{ repository: GQLRepository }>(
			`
        query($owner: String!, $repo: String!, $issueNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                issue(number: $issueNumber) {
                    timelineItems(first: 100, itemTypes: [CONNECTED_EVENT, CROSS_REFERENCED_EVENT]) {
                        nodes {
                            ... on ConnectedEvent {
                                subject {
                                    ... on PullRequest {
                                        number
                                        title
																				author {
																						avatarUrl
																						login
                                        }
                                        createdAt
																				body
                                    }
                                }
                            }
                            ... on CrossReferencedEvent {
                                source {
                                    ... on PullRequest {
                                        number
                                        title
																				author {
																						avatarUrl
																						login
                                        }
																				createdAt
																				body
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
		`,
			{
				owner,
				repo,
				issueNumber
			}
		);

		// Extract and deduplicate PRs
		const linkedPRs = new Map<number, LinkedItem>();
		const timelineItems = result?.repository?.issue?.timelineItems?.nodes ?? [];

		for (const item of timelineItems) {
			if (!item) continue;
			if (!("subject" in item) && !("source" in item)) continue;
			const pr = item.subject || item.source;
			linkedPRs.set(pr.number, pr);
		}

		return Array.from(linkedPRs.values());
	}

	/**
	 * Get the issues linked to the given PR number.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @param prNumber the PR number
	 * @returns the linked issues
	 * @private
	 */
	async #getLinkedIssues(owner: string, repo: string, prNumber: number) {
		const result = await this.#octokit.graphql<{ repository: GQLRepository }>(
			`
        query($owner: String!, $repo: String!, $prNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                pullRequest(number: $prNumber) {
                    closingIssuesReferences(first: 50) {
                        nodes {
                            number
                            title
														author {
																login
																avatarUrl
														}
														createdAt
                            body
                        }
                    }
                }
            }
        }
		`,
			{
				owner,
				repo,
				prNumber
			}
		);

		// Extract and deduplicate issues
		const linkedIssues = new Map<number, LinkedItem>();

		const closingIssues = result?.repository?.pullRequest?.closingIssuesReferences?.nodes ?? [];
		for (const issue of closingIssues) {
			if (!issue) continue;
			linkedIssues.set(issue.number, issue);
		}

		return Array.from(linkedIssues.values());
	}

	/**
	 * Get all the releases for a given repository
	 *
	 * @param repository the repository to get the releases for
	 * @returns the releases, either cached or fetched
	 */
	async getReleases(repository: Repository) {
		const cacheKey = this.#getRepoKey(repository.owner, repository.repoName, "releases");

		const cachedReleases = await this.#redis.json.get<GitHubRelease[]>(cacheKey);
		if (cachedReleases) {
			console.log(`Cache hit for releases for ${cacheKey}`);
			return cachedReleases;
		}

		console.log(`Cache miss for releases for ${cacheKey}, fetching from GitHub API`);

		const releases = await this.#fetchReleases(repository);

		await this.#redis.json.set(cacheKey, "$", releases);
		await this.#redis.expire(cacheKey, RELEASES_TTL);

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
	 * Get a map that contains the descriptions
	 * of all the packages in the given repository.
	 * Irrelevant paths (e.g., tests) or empty descriptions
	 * are excluded.
	 *
	 * @param repository the repository to fetch the
	 * descriptions in
	 * @returns a map of paths to descriptions.
	 * @private
	 */
	async getDescriptions(repository: Repository) {
		const cacheKey = this.#getRepoKey(repository.owner, repository.repoName, "descriptions");

		const cachedDescriptions = await this.#redis.json.get<{ [key: string]: string }>(cacheKey);
		if (cachedDescriptions) {
			console.log(`Cache hit for descriptions for ${cacheKey}`);
			return cachedDescriptions;
		}

		console.log(`Cache miss for releases for ${cacheKey}, fetching from GitHub API`);

		const { owner, repoName: repo } = repository;

		const { data: allFiles } = await this.#octokit.rest.git.getTree({
			owner,
			repo,
			tree_sha: "HEAD",
			recursive: "true"
		});

		const allPackageJson = allFiles.tree
			.map(({ path }) => path)
			.filter(path => path !== undefined)
			.filter(
				path =>
					!path.includes("/test/") &&
					!path.includes("/e2e-tests/") &&
					(path === "package.json" || path.endsWith("/package.json"))
			);

		const descriptions = new Map<string, string>();
		for (const path of allPackageJson) {
			const { data: packageJson } = await this.#octokit.rest.repos.getContent({
				owner,
				repo,
				path
			});

			if (!("content" in packageJson)) continue; // filter out empty or multiple results
			const { content, encoding, type } = packageJson;
			if (type !== "file" || !content) continue; // filter out directories and empty files
			const packageFile =
				encoding === "base64" ? Buffer.from(content, "base64").toString() : content;

			try {
				const { description } = JSON.parse(packageFile) as { description: string };
				if (description) descriptions.set(path, description);
			} catch {
				// ignore
			}
		}

		await this.#redis.json.set(cacheKey, "$", Object.fromEntries(descriptions));
		await this.#redis.expire(cacheKey, DESCRIPTIONS_TTL);

		return Object.fromEntries(descriptions);
	}

	/**
	 * Checks if releases are present in the cache for the
	 * given GitHub info
	 *
	 * @param owner the owner of the GitHub repository to check the
	 * existence in the cache for
	 * @param repo the name of the GitHub repository to check the
	 * existence in the cache for
	 * @param type the kind of cache to target
	 * @returns whether the repository is cached or not
	 */
	async exists(owner: string, repo: string, type: KeyType) {
		const cacheKey = this.#getRepoKey(owner, repo, type);
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
	 * @param type the kind of cache to target
	 */
	async deleteEntry(owner: string, repo: string, type: KeyType) {
		const cacheKey = this.#getRepoKey(owner, repo, type);
		await this.#redis.del(cacheKey);
	}
}

export const gitHubCache = new GitHubCache(KV_REST_API_URL, KV_REST_API_TOKEN, GITHUB_TOKEN);
