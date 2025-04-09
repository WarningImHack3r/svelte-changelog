import type { Octokit } from "octokit";
import type { GitHubRelease } from "$lib/server/github-cache";

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

export type RepoInfo = {
	/**
	 * Mode to fetch the releases of the repo.
	 * - `releases`: Fetches from the Releases page
	 * - `changelog`: Fetches the changelog of the repo, if available
	 */
	changesMode?: "releases" | "changelog";
	/**
	 * Repository name on GitHub
	 */
	repoName: string;
	/**
	 * Filter function to apply to the releases of the repo.
	 * If it returns false, the release is filtered out.
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

export const availableCategory = ["svelte", "kit", "others"] as const;
export type Category = (typeof availableCategory)[number];

export type Issues = InstanceType<typeof Octokit>["rest"]["issues"];
export type Pulls = InstanceType<typeof Octokit>["rest"]["pulls"];
