import { dev } from "$app/environment";
import { GITHUB_TOKEN, KV_REST_API_TOKEN, KV_REST_API_URL } from "$env/static/private";
import type {
	CommentAuthorAssociation,
	Issue as GQLIssue,
	PullRequest as GQLPullRequest,
	Repository as GQLRepository,
	ReferencedSubject
} from "@octokit/graphql-schema";
import { Redis } from "@upstash/redis";
import { Octokit } from "octokit";
import parseChangelog from "$lib/changelog-parser";
import type { Repository } from "$lib/repositories";
import type { Issues, Pulls } from "$lib/types";
import { CacheHandler, type RedisJson } from "./cache-handler";

/**
 * A strict version of Extract.
 *
 * @see {@link https://github.com/sindresorhus/type-fest/issues/222#issuecomment-940597759|Original implementation}
 */
type ExtractStrict<T, U extends T> = U;

export type GitHubRelease = Awaited<
	ReturnType<InstanceType<typeof Octokit>["rest"]["repos"]["listReleases"]>
>["data"][number];

export type Member = Awaited<
	ReturnType<InstanceType<typeof Octokit>["rest"]["orgs"]["listMembers"]>
>["data"][number];

type OwnerKeyType = "members";

type RepoKeyType =
	| "releases"
	| "descriptions"
	| "issue"
	| "issues"
	| "pr"
	| "prs"
	| "discussion"
	| "discussions";

export type ItemDetails = {
	comments: Awaited<ReturnType<Issues["listComments"]>>["data"];
};

export type Issue = Awaited<ReturnType<Issues["get"]>>["data"];
export type IssueDetails = ItemDetails & {
	info: Issue;
	linkedPrs: LinkedItem[];
};

export type PullRequest = Awaited<ReturnType<Pulls["get"]>>["data"];
export type ListedPullRequest = Awaited<ReturnType<Pulls["list"]>>["data"][number];
export type PullRequestDetails = ItemDetails & {
	info: PullRequest;
	commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"];
	files: Awaited<ReturnType<Pulls["listFiles"]>>["data"];
	linkedIssues: LinkedItem[];
};

export type DiscussionDetails = {
	info: Discussion;
	comments: DiscussionComment[];
};

type TeamDiscussion = Awaited<
	ReturnType<InstanceType<typeof Octokit>["rest"]["teams"]["listDiscussionsInOrg"]>
>["data"][number];
export type Discussion = {
	repository_url: string;
	category: {
		id: number;
		node_id: string;
		repository_id: number;
		emoji: `:${string}:`;
		name: string;
		description: string;
		created_at: string;
		updated_at: string;
		slug: string;
		is_answerable: boolean;
	};
	answer_html_url: string | null;
	answer_chosen_at: string | null;
	answer_chosen_by: TeamDiscussion["author"] | null;
	id: number;
	user: TeamDiscussion["author"];
	labels: never[];
	state: "open" | "closed";
	state_reason: "resolved" | null;
	locked: boolean;
	comments: TeamDiscussion["comments_count"];
	author_association: CommentAuthorAssociation;
	active_lock_reason: null;
	timeline_url: string;
} & Pick<
	TeamDiscussion,
	"html_url" | "node_id" | "number" | "title" | "created_at" | "updated_at" | "body" | "reactions"
>;
type TeamDiscussionComment = Awaited<
	ReturnType<InstanceType<typeof Octokit>["rest"]["teams"]["listDiscussionCommentsInOrg"]>
>["data"][number];
export type DiscussionComment = {
	id: number;
	parent_id: number | null;
	child_comment_count: number;
	repository_url: `${string}/${string}`;
	discussion_id: number;
	author_association: CommentAuthorAssociation;
	user: TeamDiscussion["author"];
} & Pick<
	TeamDiscussionComment,
	"node_id" | "html_url" | "created_at" | "updated_at" | "body" | "reactions"
>;

export type LinkedItem = {
	html_url: string;
	repository: {
		owner: string;
		name: string;
	};
	reactions: GitHubRelease["reactions"];
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
 * The TTL of organization members, in seconds.
 */
const MEMBERS_TTL = 60 * 60 * 24 * 2; // 2 days
/**
 * The TTL for non-deprecated packages, in seconds
 */
const DEPRECATIONS_TTL = 60 * 60 * 24 * 2; // 2 days

/**
 * A fetch layer to reach the GitHub API
 * with an additional caching mechanism.
 */
export class GitHubCache {
	readonly #cache: CacheHandler;
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
		this.#cache = new CacheHandler(
			new Redis({
				url: redisUrl,
				token: redisToken
			}),
			dev
		);

		this.#octokit = new Octokit({
			auth: githubToken
		});
	}

	/**
	 * Generates a Redis key from the passed info.
	 *
	 * @param owner the GitHub repository owner
	 * @param type the kind of cache to use
	 * @param args the optional additional values to append
	 * at the end of the key; every element will be interpolated
	 * in a string
	 * @returns the pure computed key
	 * @private
	 */
	#getOwnerKey(owner: string, type: OwnerKeyType, ...args: unknown[]) {
		const strArgs = args.map(a => `:${a}`).join("");
		return `owner:${owner}:${type}${strArgs}`;
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
	#getRepoKey(owner: string, repo: string, type: RepoKeyType, ...args: unknown[]) {
		const strArgs = args.map(a => `:${a}`).join("");
		return `repo:${owner}/${repo}:${type}${strArgs}`;
	}

	/**
	 * Generates a Redis key from the passed info.
	 *
	 * @param packageName the package name
	 * @param args the optional additional values to append
	 * at the end of the key; every element will be interpolated
	 * in a string
	 * @returns the pure computed key
	 * @private
	 */
	#getPackageKey(packageName: string, ...args: unknown[]) {
		const strArgs = args.map(a => `:${a}`).join("");
		return `package:${packageName}${strArgs}`;
	}

	/**
	 * An abstraction over general processing that:
	 * 1. tries getting stuff from Redis cache
	 * 2. calls the promise to get new data if no value is found in cache
	 * 3. store this new value back in the cache with an optional TTL before returning the value.
	 *
	 * @returns a currying promise than handles everything needed for requests
	 * @private
	 */
	#processCached<RType extends RedisJson>() {
		/**
		 * Inner currying function to circumvent unsupported partial inference
		 *
		 * @param cacheKey the cache key to fetch Redis with
		 * @param promise the promise to call to get new data if the cache is empty
		 * @param transformer the function that transforms the return from the promise to the target return value
		 * @param ttl the optional TTL to use for the newly cached data
		 *
		 * @see {@link https://github.com/microsoft/TypeScript/issues/26242|Partial type inference discussion}
		 */
		return async <PromiseType>(
			cacheKey: string,
			promise: () => Promise<PromiseType>,
			transformer: (from: Awaited<PromiseType>) => RType | Promise<RType>,
			ttl: number | ((value: RType) => number | undefined) | undefined = undefined
		): Promise<RType> => {
			const cachedValue = await this.#cache.get<RType>(cacheKey);
			if (cachedValue) {
				console.log(`Cache hit for ${cacheKey}`);
				return cachedValue;
			}

			console.log(`Cache miss for ${cacheKey}`);

			const newValue = await transformer(await promise());

			let ttlResult: number | undefined = undefined;
			if (ttl !== undefined) {
				if (typeof ttl === "function") {
					ttlResult = ttl(newValue);
				} else {
					ttlResult = ttl;
				}
			}
			await this.#cache.set(cacheKey, newValue, ttlResult);

			return newValue;
		};
	}

	/**
	 * Get the item (issue or pr) with the given information.
	 * Return the appropriate value if the type is defined or
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
		type: ExtractStrict<RepoKeyType, "issue" | "pr" | "discussions"> | undefined = undefined
	) {
		// Known type we assume the existence of
		switch (type) {
			case "issue":
				return await this.getIssueDetails(owner, repo, id);
			case "pr":
				return await this.getPullRequestDetails(owner, repo, id);
			case "discussions":
				return await this.getDiscussionDetails(owner, repo, id);
		}

		// Unknown type, try to find or null otherwise
		try {
			return await this.getPullRequestDetails(owner, repo, id);
		} catch (err: unknown) {
			console.error(`Error trying to get PR details for ${owner}/${repo}: ${err}`);
		}

		try {
			// doesn't come first because issues will also resolve for prs
			return await this.getIssueDetails(owner, repo, id);
		} catch (err: unknown) {
			console.error(`Error trying to get issue details for ${owner}/${repo}: ${err}`);
		}

		try {
			return await this.getDiscussionDetails(owner, repo, id);
		} catch (err: unknown) {
			console.error(`Error trying to get discussion details for ${owner}/${repo}: ${err}`);
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
		return await this.#processCached<IssueDetails>()(
			this.#getRepoKey(owner, repo, "issue", id),
			() =>
				Promise.all([
					this.#octokit.rest.issues.get({ owner, repo, issue_number: id }),
					this.#octokit.rest.issues.listComments({ owner, repo, issue_number: id }),
					this.#getLinkedPullRequests(owner, repo, id)
				]),
			([{ data: info }, { data: comments }, linkedPrs]) => ({
				info,
				comments,
				linkedPrs
			}),
			FULL_DETAILS_TTL
		);
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
		return await this.#processCached<PullRequestDetails>()(
			this.#getRepoKey(owner, repo, "pr", id),
			() =>
				Promise.all([
					this.#octokit.rest.pulls.get({ owner, repo, pull_number: id }),
					this.#octokit.rest.issues.listComments({ owner, repo, issue_number: id }),
					this.#octokit.rest.pulls.listCommits({ owner, repo, pull_number: id }),
					this.#octokit.rest.pulls.listFiles({ owner, repo, pull_number: id }),
					this.#getLinkedIssues(owner, repo, id)
				]),
			([{ data: info }, { data: comments }, { data: commits }, { data: files }, linkedIssues]) => ({
				info,
				comments,
				commits,
				files,
				linkedIssues
			}),
			FULL_DETAILS_TTL
		);
	}

	/**
	 * Get the discussion from the specified info.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @param id the discussion number
	 * @returns the matching discussion
	 * @throws Error if the discussion is not found
	 */
	async getDiscussionDetails(owner: string, repo: string, id: number) {
		return await this.#processCached<DiscussionDetails>()(
			this.#getRepoKey(owner, repo, "discussion", id),
			() =>
				Promise.all([
					this.#octokit.request("GET /repos/{owner}/{repo}/discussions/{number}", {
						owner,
						repo,
						number: id
					}),
					this.#octokit.paginate<DiscussionComment>(
						"GET /repos/{owner}/{repo}/discussions/{number}/comments",
						{
							owner,
							repo,
							number: id,
							per_page
						}
					)
				]),
			([{ data: discussion }, comments]) => ({
				info: discussion,
				comments
			}),
			FULL_DETAILS_TTL
		);
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
        query($owner: String!, $repo: String!, $issueNumber: Int!, $count: Int!) {
					repository(owner: $owner, name: $repo) {
						issue(number: $issueNumber) {
							timelineItems(first: $count, itemTypes: [CONNECTED_EVENT, CROSS_REFERENCED_EVENT]) {
								nodes {
									... on ConnectedEvent {
										subject {
											... on PullRequest {
												url
												reactions(first: $count) {
													nodes {
														content
													}
												}
												repository {
													owner {
														login
													}
													name
												}
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
												url
												reactions(first: $count) {
													nodes {
														content
													}
												}
												repository {
													owner {
														login
													}
													name
												}
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
				issueNumber,
				count: per_page
			}
		);

		// Extract and deduplicate PRs
		const linkedPRs = new Map<number, LinkedItem>();
		const timelineItems = result?.repository?.issue?.timelineItems?.nodes ?? [];

		for (const item of timelineItems) {
			if (!item) continue;
			if ("subject" in item) {
				const issueOrPr = item.subject;
				if (!issueOrPr || !("number" in issueOrPr)) continue;
				linkedPRs.set(issueOrPr.number, this.#gqlToLinkedItem(issueOrPr));
			} else if ("source" in item) {
				const referencedSubject = item.source;
				if (!referencedSubject || !("number" in referencedSubject)) continue;
				linkedPRs.set(referencedSubject.number, this.#gqlToLinkedItem(referencedSubject));
			}
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
        query($owner: String!, $repo: String!, $prNumber: Int!, $count: Int!) {
					repository(owner: $owner, name: $repo) {
						pullRequest(number: $prNumber) {
							closingIssuesReferences(first: $count) {
								nodes {
									url
									reactions(first: $count) {
										nodes {
											content
										}
									}
									repository {
										owner {
											login
										}
										name
									}
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
				prNumber,
				count: per_page
			}
		);

		// Extract and deduplicate issues
		const linkedIssues = new Map<number, LinkedItem>();

		const closingIssues = result?.repository?.pullRequest?.closingIssuesReferences?.nodes ?? [];
		for (const issue of closingIssues) {
			if (!issue) continue;
			linkedIssues.set(issue.number, this.#gqlToLinkedItem(issue));
		}

		return Array.from(linkedIssues.values());
	}

	/**
	 * Transforms a raw GraphQL return type to a LinkedItem
	 *
	 * @param gql the raw GraphQL item
	 * @returns the mapped LinkedItem
	 */
	#gqlToLinkedItem({
		url,
		repository,
		reactions,
		...rest
	}: GQLIssue | GQLPullRequest | ReferencedSubject): LinkedItem {
		return {
			...rest,
			html_url: url,
			repository: {
				owner: repository.owner.login,
				name: repository.name
			},
			reactions: reactions.nodes
				? {
						url: "",
						total_count: reactions.nodes.length,
						"+1": reactions.nodes.filter(reaction => reaction?.content === "THUMBS_UP").length,
						"-1": reactions.nodes.filter(reaction => reaction?.content === "THUMBS_DOWN").length,
						laugh: reactions.nodes.filter(reaction => reaction?.content === "LAUGH").length,
						confused: reactions.nodes.filter(reaction => reaction?.content === "CONFUSED").length,
						heart: reactions.nodes.filter(reaction => reaction?.content === "HEART").length,
						hooray: reactions.nodes.filter(reaction => reaction?.content === "HOORAY").length,
						eyes: reactions.nodes.filter(reaction => reaction?.content === "EYES").length,
						rocket: reactions.nodes.filter(reaction => reaction?.content === "ROCKET").length
					}
				: undefined
		};
	}

	/**
	 * Get all the releases for a given repository
	 *
	 * @param repository the repository to get the releases for
	 * @returns the releases, either cached or fetched
	 */
	async getReleases(repository: Repository) {
		return await this.#processCached<GitHubRelease[]>()(
			this.#getRepoKey(repository.repoOwner, repository.repoName, "releases"),
			() => this.#fetchReleases(repository),
			releases => releases,
			RELEASES_TTL
		);
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
		const { repoOwner: owner, repoName: repo, changesMode, changelogContentsReplacer } = repository;
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
	 * @param owner the GitHub repository owner to fetch the
	 * descriptions in
	 * @param repo the GitHub repository name to fetch the
	 * descriptions in
	 * @returns a map of paths to descriptions.
	 */
	async getDescriptions(owner: string, repo: string) {
		return await this.#processCached<{ [key: string]: string }>()(
			this.#getRepoKey(owner, repo, "descriptions"),
			() =>
				this.#octokit.rest.git.getTree({
					owner,
					repo,
					tree_sha: "HEAD",
					recursive: "true"
				}),
			async ({ data: allFiles }) => {
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
				return Object.fromEntries(descriptions);
			},
			DESCRIPTIONS_TTL
		);
	}

	/**
	 * Get the list of members for a given organization.
	 *
	 * @param owner the GitHub organization name
	 * @returns a list of members, or `undefined` if not existing
	 */
	async getOrganizationMembers(owner: string) {
		return await this.#processCached<Member[]>()(
			this.#getOwnerKey(owner, "members"),
			async () => {
				try {
					const { data: members } = await this.#octokit.rest.orgs.listPublicMembers({
						org: owner,
						per_page
					});
					return members;
				} catch {
					return [] as Member[];
				}
			},
			members => members,
			MEMBERS_TTL
		);
	}

	/**
	 * Get all the issues for a given GitHub repository.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @returns a list of issues, empty if not existing
	 */
	async getAllIssues(owner: string, repo: string) {
		return await this.#processCached<Issue[]>()(
			this.#getRepoKey(owner, repo, "issues"),
			async () => {
				try {
					const { data: issues } = await this.#octokit.rest.issues.listForRepo({
						owner,
						repo,
						per_page
					});
					return issues;
				} catch {
					return [] as Issue[];
				}
			},
			issues => issues,
			FULL_DETAILS_TTL
		);
	}

	/**
	 * Get all the pull requests for a given GitHub repository.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @returns a list of pull requests, empty if not existing
	 */
	async getAllPRs(owner: string, repo: string) {
		return await this.#processCached<ListedPullRequest[]>()(
			this.#getRepoKey(owner, repo, "prs"),
			async () => {
				try {
					const { data: prs } = await this.#octokit.rest.pulls.list({
						owner,
						repo,
						per_page
					});
					return prs;
				} catch {
					return [] as ListedPullRequest[];
				}
			},
			prs => prs,
			FULL_DETAILS_TTL
		);
	}

	/**
	 * Get all the discussions for a given GitHub repository.
	 *
	 * @param owner the GitHub repository owner
	 * @param repo the GitHub repository name
	 * @returns a list of discussions, empty if not existing
	 */
	async getAllDiscussions(owner: string, repo: string) {
		return await this.#processCached<Discussion[]>()(
			this.#getRepoKey(owner, repo, "discussions"),
			async () => {
				try {
					return await this.#octokit.paginate<Discussion>("GET /repos/{owner}/{repo}/discussions", {
						owner,
						repo,
						per_page
					});
				} catch {
					return [] as Discussion[];
				}
			},
			discussions => discussions,
			FULL_DETAILS_TTL
		);
	}

	/**
	 * Get the deprecation state of a package from its name.
	 *
	 * @param packageName the name of the package to search
	 * @returns the deprecation status message if any, `false` otherwise
	 */
	async getPackageDeprecation(packageName: string) {
		return await this.#processCached<{ value: string | false }>()(
			this.#getPackageKey(packageName, "deprecation"),
			async () => {
				try {
					// npmjs.org in a GitHub cache, I know, but hey, let's put that under the fact that
					// GitHub owns npmjs.org okay??
					const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
					if (res.status !== 200) return {};
					return (await res.json()) as { deprecated?: boolean | string };
				} catch (error) {
					console.error(`Error fetching npmjs.org for package ${packageName}:`, error);
					return {};
				}
			},
			({ deprecated }) => {
				if (deprecated === undefined) return { value: false };
				if (typeof deprecated === "boolean")
					return { value: deprecated && "This package is deprecated" };
				return { value: deprecated || "This package is deprecated" };
			},
			item => (item.value === false ? DEPRECATIONS_TTL : undefined)
		);
	}
}

export const githubCache = new GitHubCache(KV_REST_API_URL, KV_REST_API_TOKEN, GITHUB_TOKEN);
