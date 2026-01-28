import type { Octokit } from "octokit";
import type { GitHubRelease } from "$lib/server/github-cache";

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type RepoEntry = {
	/**
	 * The name of the entry, displayed across the website
	 */
	name: string;
	/**
	 * The description of the entry.
	 * Defaults to the name.
	 */
	description?: string;
	/**
	 * The list of repositories included in this category
	 */
	repos: RepoInfo[];
};

export type RepoInfo = {
	/**
	 * Mode to fetch the releases of the repo.
	 * - `releases`: Fetches from the Releases page
	 * - `changelog`: Fetches the changelog of the repo, if available
	 *
	 * @default "releases"
	 */
	changesMode?: "releases" | "changelog";
	/**
	 * Repository organization/owner on GitHub
	 *
	 * @default "sveltejs"
	 */
	repoOwner?: string;
	/**
	 * Repository name on GitHub
	 */
	repoName: string;
	/**
	 * Filter function to apply to the releases of the repo.
	 * If it returns false, the release is filtered out.
	 * By default, no filtering is applied.
	 *
	 * @param release The release to filter
	 * @returns whether we want to keep the release
	 */
	dataFilter?: (release: GitHubRelease) => boolean;
	/**
	 * Extracts the package name and version from the tag name.
	 *
	 * @param tag The tag name to extract the name and version from
	 * @returns an array with the package name, and the package version
	 */
	metadataFromTag: (tag: string) => [string, string];
	/**
	 * Replaces the contents of the changelog file.
	 * Only used when `changesMode` is set to `changelog`.
	 * By default, no replacement is performed.
	 *
	 * @param file The contents of the changelog file
	 * @returns the modified contents
	 */
	changelogContentsReplacer?: (file: string) => string;
};

export const availableCategories = ["svelte", "kit", "tools", "libs"] as const;
export type Category = (typeof availableCategories)[number];

export type Issues = InstanceType<typeof Octokit>["rest"]["issues"];
export type Pulls = InstanceType<typeof Octokit>["rest"]["pulls"];
/**
 * The Pull, Issue or Discussion type.
 * Matches the slug in GitHub URLs.
 */
export type PID = "pull" | "issue" | "discussion";

/**
 * The JSON API response for `https://github.com/{user}/{repo}/branch_commits/{sha}`
 */
export type BranchCommit = {
	/**
	 * The branches for the given commit
	 */
	branches: {
		/**
		 * The branch name
		 * @example main
		 */
		branch: string;
		/**
		 * The linked pull requests
		 */
		prs: {
			/**
			 * The PR number
			 * @example 16119
			 */
			number: number;
			/**
			 * I have no clue honestly, `false` most often
			 */
			showPrefix: boolean;
			/**
			 * The repository this PR is on
			 */
			repo: {
				/**
				 * The repository name
				 * @example svelte
				 */
				name: string;
				/**
				 * The repository owner
				 * @example sveltejs
				 */
				ownerLogin: string;
			};
			/**
			 * The PR's node ID(?)
			 */
			globalRelayId: string;
		}[];
	}[];
	/**
	 * A list of tags this commit appears in
	 */
	tags: string[];
};

/**
 * The slug name for all the packages
 */
export const ALL_SLUG = "all";

/**
 * A package's local visibility settings
 */
export type PackageSettings = {
	showPrereleases: boolean;
	releasesType: Lowercase<(typeof releasesTypes)[number]>;
};
export const releasesTypes = ["All", "Major", "Minor", "Patch"] as const;
