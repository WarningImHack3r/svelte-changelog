export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type Repo = {
	/**
	 * Repository name on GitHub
	 */
	repoName: string;
	/**
	 * Filter function to apply to the releases of the repo.
	 * If it returns false, the release is filtered out.
	 * Could not use Octokit's `data` type because it's not exported.
	 *
	 * @param release The release to filter
	 */
	dataFilter?: (release: { tag_name: string }) => boolean;
	/**
	 * Extracts the version from the tag name.
	 *
	 * @param tag The tag name to extract the version from
	 */
	versionFromTag: (tag: string) => string;
};

export type Tab = "svelte" | "kit" | "others";

export type Settings = {
	githubToken?: string;
};
