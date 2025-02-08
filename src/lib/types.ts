import type { Octokit } from "octokit";

export type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

export type Repo = {
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
	 */
	dataFilter?: (
		release: Awaited<
			ReturnType<InstanceType<typeof Octokit>["rest"]["repos"]["listReleases"]>
		>["data"][number]
	) => boolean;
	/**
	 * Extracts the version from the tag name.
	 *
	 * @param tag The tag name to extract the version from
	 */
	versionFromTag: (tag: string) => string;
	/**
	 * Replaces the contents of the changelog file.
	 * Only used when `changesMode` is set to `changelog`.
	 * By default, no replacement is performed.
	 *
	 * @param file The contents of the changelog file
	 */
	changelogContentsReplacer?: (file: string) => string;
};

export const availableTabs = ["svelte", "kit", "others"] as const;
export type Tab = (typeof availableTabs)[number];

export const tokenKey = "token";
export const oauthCookieKey = "github_oauth_state";
