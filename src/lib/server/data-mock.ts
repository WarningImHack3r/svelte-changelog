import type { Repository as GQLRepository } from "@octokit/graphql-schema";
import type { OctokitResponse } from "@octokit/types";
import type { Octokit } from "octokit";
import type { Discussion, GitHubRelease, Issue, PullRequest } from "./github-cache";

/**
 * A wrapper for returning some data inside an OctokitResponse
 *
 * @param data the data to return
 * @returns the formatted response for a given data
 */
export function createOctokitResponse<T>(data: T): OctokitResponse<T, 200> {
	return {
		data,
		status: 200,
		headers: {},
		url: ""
	};
}

export const user: NonNullable<Issue["user"]> = {
	login: "",
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
};

export const release: GitHubRelease = {
	url: "",
	html_url: "",
	assets_url: "",
	upload_url: "",
	tarball_url: null,
	zipball_url: null,
	id: 0,
	node_id: "",
	tag_name: "",
	target_commitish: "main",
	name: null,
	draft: false,
	prerelease: false,
	created_at: "",
	published_at: null,
	author: {
		login: "",
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
};

export const repo: PullRequest["head"]["repo"] = {
	id: 0,
	node_id: "",
	name: "",
	full_name: "",
	private: false,
	owner: user,
	html_url: "",
	description: null,
	fork: false,
	url: "",
	forks_url: "",
	keys_url: "",
	collaborators_url: "",
	teams_url: "",
	hooks_url: "",
	issue_events_url: "",
	events_url: "",
	assignees_url: "",
	branches_url: "",
	tags_url: "",
	blobs_url: "",
	git_tags_url: "",
	git_refs_url: "",
	trees_url: "",
	statuses_url: "",
	languages_url: "",
	stargazers_url: "",
	contributors_url: "",
	subscribers_url: "",
	subscription_url: "",
	commits_url: "",
	git_commits_url: "",
	comments_url: "",
	issue_comment_url: "",
	contents_url: "",
	compare_url: "",
	merges_url: "",
	archive_url: "",
	downloads_url: "",
	issues_url: "",
	pulls_url: "",
	milestones_url: "",
	notifications_url: "",
	labels_url: "",
	releases_url: "",
	deployments_url: "",
	created_at: null,
	updated_at: null,
	pushed_at: null,
	git_url: "",
	ssh_url: "",
	clone_url: "",
	svn_url: "",
	homepage: null,
	size: 0,
	stargazers_count: 0,
	watchers_count: 0,
	language: null,
	has_issues: false,
	has_projects: false,
	has_downloads: false,
	has_wiki: false,
	has_pages: false,
	forks_count: 0,
	mirror_url: null,
	archived: false,
	disabled: false,
	open_issues_count: 0,
	license: null,
	allow_forking: false,
	forks: 0,
	open_issues: 0,
	watchers: 0,
	default_branch: ""
};

export const issue: Issue = {
	id: 0,
	node_id: "",
	url: "",
	repository_url: "",
	labels_url: "",
	comments_url: "",
	events_url: "",
	html_url: "",
	number: 0,
	state: "",
	title: "",
	user: null,
	labels: [],
	locked: false,
	assignee: user,
	milestone: null,
	comments: 0,
	created_at: "",
	updated_at: "",
	closed_at: null
};

export const pr: PullRequest = {
	url: "",
	id: 0,
	node_id: "",
	html_url: "",
	diff_url: "",
	patch_url: "",
	issue_url: "",
	number: 0,
	state: "open",
	locked: false,
	title: "",
	user,
	body: "",
	created_at: "",
	updated_at: "",
	closed_at: null,
	merged_at: null,
	merge_commit_sha: null,
	assignee: null,
	labels: [],
	milestone: null,
	commits_url: "",
	review_comments_url: "",
	review_comment_url: "",
	comments_url: "",
	statuses_url: "",
	head: {
		label: "",
		ref: "",
		sha: "",
		user,
		repo
	},
	base: {
		label: "",
		ref: "",
		sha: "",
		user,
		repo
	},
	_links: {
		self: {
			href: ""
		},
		html: {
			href: ""
		},
		issue: {
			href: ""
		},
		comments: {
			href: ""
		},
		review_comments: {
			href: ""
		},
		review_comment: {
			href: ""
		},
		commits: {
			href: ""
		},
		statuses: {
			href: ""
		}
	},
	author_association: "MEMBER",
	auto_merge: null,
	merged: false,
	mergeable: null,
	mergeable_state: "",
	merged_by: null,
	comments: 0,
	review_comments: 0,
	maintainer_can_modify: false,
	commits: 0,
	additions: 0,
	deletions: 0,
	changed_files: 0
};

export const discussion: Discussion = {
	repository_url: "",
	category: {
		id: 0,
		node_id: "",
		repository_id: 0,
		emoji: "::",
		name: "",
		description: "",
		created_at: "",
		updated_at: "",
		slug: "",
		is_answerable: false
	},
	answer_html_url: null,
	answer_chosen_at: null,
	answer_chosen_by: null,
	id: 0,
	user,
	labels: [],
	state: "open",
	state_reason: null,
	locked: false,
	comments: 0,
	author_association: "NONE",
	active_lock_reason: null,
	timeline_url: "",
	html_url: "",
	node_id: "",
	number: 0,
	title: "",
	created_at: "",
	updated_at: "",
	body: ""
};

type Commit = Awaited<ReturnType<InstanceType<typeof Octokit>["rest"]["git"]["getCommit"]>>["data"];
export const commit: Commit = {
	sha: "",
	node_id: "",
	url: "",
	author: {
		date: "",
		email: "",
		name: ""
	},
	committer: {
		date: "",
		email: "",
		name: ""
	},
	html_url: "",
	message: "",
	parents: [],
	tree: {
		sha: "",
		url: ""
	},
	verification: {
		payload: null,
		reason: "",
		signature: null,
		verified: false,
		verified_at: null
	}
};

type GitTree = Awaited<ReturnType<InstanceType<typeof Octokit>["rest"]["git"]["getTree"]>>["data"];
export const gitTree: GitTree = {
	sha: "",
	truncated: false,
	tree: []
};

const gqlArray = {
	totalCount: 0,
	pageInfo: {
		hasNextPage: false,
		hasPreviousPage: false
	}
};

export const gqlRepo: GQLRepository = {
	allowUpdateBranch: false,
	assignableUsers: gqlArray,
	autoMergeAllowed: false,
	branchProtectionRules: gqlArray,
	commitComments: gqlArray,
	createdAt: "",
	deleteBranchOnMerge: false,
	deployKeys: gqlArray,
	deployments: gqlArray,
	descriptionHTML: "",
	discussionCategories: gqlArray,
	discussions: gqlArray,
	environments: gqlArray,
	forkCount: 0,
	forkingAllowed: false,
	forks: {
		...gqlArray,
		totalDiskUsage: 0
	},
	fundingLinks: [],
	hasDiscussionsEnabled: false,
	hasIssuesEnabled: false,
	hasProjectsEnabled: false,
	hasSponsorshipsEnabled: false,
	hasVulnerabilityAlertsEnabled: false,
	hasWikiEnabled: false,
	id: "",
	isArchived: false,
	isBlankIssuesEnabled: false,
	isDisabled: false,
	isEmpty: false,
	isFork: false,
	isInOrganization: false,
	isLocked: false,
	isMirror: false,
	isPrivate: false,
	isTemplate: false,
	isUserConfigurationRepository: false,
	issues: gqlArray,
	mentionableUsers: gqlArray,
	mergeCommitAllowed: false,
	mergeCommitMessage: "BLANK",
	mergeCommitTitle: "PR_TITLE",
	name: "",
	nameWithOwner: "",
	openGraphImageUrl: "",
	owner: {
		anyPinnableItems: false,
		auditLog: gqlArray,
		avatarUrl: "",
		bioHTML: "",
		canReceiveOrganizationEmailsWhenNotificationsRestricted: false,
		commitComments: gqlArray,
		companyHTML: "",
		contributionsCollection: {
			commitContributionsByRepository: [],
			contributionCalendar: {
				colors: [],
				isHalloween: false,
				months: [],
				totalContributions: 0,
				weeks: []
			},
			contributionYears: [],
			doesEndInCurrentMonth: false,
			endedAt: "",
			hasActivityInThePast: false,
			hasAnyContributions: false,
			hasAnyRestrictedContributions: false,
			isSingleDay: false,
			issueContributions: gqlArray,
			issueContributionsByRepository: [],
			pullRequestContributions: gqlArray,
			pullRequestContributionsByRepository: [],
			pullRequestReviewContributions: gqlArray,
			pullRequestReviewContributionsByRepository: [],
			repositoryContributions: gqlArray,
			restrictedContributionsCount: 0,
			startedAt: "",
			totalCommitContributions: 0,
			totalIssueContributions: 0,
			totalPullRequestContributions: 0,
			totalPullRequestReviewContributions: 0,
			totalRepositoriesWithContributedCommits: 0,
			totalRepositoriesWithContributedIssues: 0,
			totalRepositoriesWithContributedPullRequestReviews: 0,
			totalRepositoriesWithContributedPullRequests: 0,
			totalRepositoryContributions: 0,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			user: null as any // nobody will query that anyway
		},
		createdAt: "",
		enterpriseOwners: gqlArray,
		estimatedNextSponsorsPayoutInCents: 0,
		followers: gqlArray,
		following: gqlArray,
		gistComments: gqlArray,
		gists: gqlArray,
		hasSponsorsListing: false,
		hovercard: {
			contexts: []
		},
		id: "",
		ipAllowListEnabledSetting: undefined,
		email: "",
		isBountyHunter: false,
		isCampusExpert: false,
		isDeveloperProgramMember: false,
		isEmployee: false,
		isFollowingViewer: false,
		isGitHubStar: false,
		isHireable: false,
		isSiteAdmin: false,
		isSponsoredBy: false,
		isSponsoringViewer: false,
		isViewer: false,
		issueComments: gqlArray,
		issues: gqlArray,
		itemShowcase: {
			hasPinnedItems: false,
			items: gqlArray
		},
		lifetimeReceivedSponsorshipValues: gqlArray,
		lists: gqlArray,
		login: "",
		monthlyEstimatedSponsorsIncomeInCents: 0,
		organizationVerifiedDomainEmails: [],
		organizations: gqlArray,
		packages: gqlArray,
		pinnableItems: gqlArray,
		pinnedItems: gqlArray,
		pinnedItemsRemaining: 0,
		projects: gqlArray,
		projectsResourcePath: "",
		projectsUrl: "",
		projectsV2: gqlArray,
		publicKeys: gqlArray,
		pullRequests: gqlArray,
		recentProjects: gqlArray,
		repositories: {
			...gqlArray,
			totalDiskUsage: 0
		},
		repositoriesContributedTo: {
			...gqlArray,
			totalDiskUsage: 0
		},
		repositoryDiscussionComments: gqlArray,
		repositoryDiscussions: gqlArray,
		resourcePath: "",
		socialAccounts: gqlArray,
		sponsoring: gqlArray,
		sponsors: gqlArray,
		sponsorsActivities: gqlArray,
		sponsorshipNewsletters: gqlArray,
		sponsorshipsAsMaintainer: {
			...gqlArray,
			totalRecurringMonthlyPriceInCents: 0,
			totalRecurringMonthlyPriceInDollars: 0
		},
		sponsorshipsAsSponsor: {
			...gqlArray,
			totalRecurringMonthlyPriceInCents: 0,
			totalRecurringMonthlyPriceInDollars: 0
		},
		starredRepositories: {
			...gqlArray,
			isOverLimit: false
		},
		suggestedListNames: [],
		topRepositories: {
			...gqlArray,
			totalDiskUsage: 0
		},
		updatedAt: "",
		url: "",
		viewerCanChangePinnedItems: false,
		viewerCanCreateProjects: false,
		viewerCanFollow: false,
		viewerCanSponsor: false,
		viewerIsFollowing: false,
		viewerIsSponsoring: false,
		watching: {
			...gqlArray,
			totalDiskUsage: 0
		}
	},
	packages: gqlArray,
	pinnedDiscussions: gqlArray,
	planFeatures: {
		codeowners: false,
		draftPullRequests: false,
		maximumAssignees: 0,
		maximumManualReviewRequests: 0,
		teamReviewRequests: false
	},
	projects: gqlArray,
	projectsResourcePath: "",
	projectsUrl: "",
	projectsV2: gqlArray,
	pullRequests: gqlArray,
	rebaseMergeAllowed: false,
	recentProjects: gqlArray,
	releases: gqlArray,
	repositoryTopics: gqlArray,
	resourcePath: "",
	shortDescriptionHTML: "",
	squashMergeAllowed: false,
	squashMergeCommitMessage: "BLANK",
	squashMergeCommitTitle: "PR_TITLE",
	squashPrTitleUsedAsDefault: false,
	sshUrl: "",
	stargazerCount: 0,
	stargazers: gqlArray,
	submodules: gqlArray,
	updatedAt: "",
	url: "",
	usesCustomOpenGraphImage: false,
	viewerCanAdminister: false,
	viewerCanCreateProjects: false,
	viewerCanSubscribe: false,
	viewerCanUpdateTopics: false,
	viewerDefaultMergeMethod: "SQUASH",
	viewerHasStarred: false,
	visibility: "PUBLIC",
	watchers: gqlArray,
	webCommitSignoffRequired: false
};
