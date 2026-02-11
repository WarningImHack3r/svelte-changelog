import type { Octokit } from "octokit";
import type { GitHubRelease } from "$lib/server/github-cache";

// ===== UTILITIES (my lil type-fest)

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * A basic "string.replaceAll()" with TypeScript types.
 * Not exported, local utility.
 */
type Replace<
	T extends string,
	S extends string,
	D extends string,
	A extends string = ""
> = T extends `${infer L}${S}${infer R}` ? Replace<R, S, D, `${A}${L}${D}`> : `${A}${T}`;

/**
 * Removes index signatures from a type, keeping only explicitly defined keys.
 *
 * This is useful when you need to work with the actual property names of a type
 * that has an index signature like `[key: string]: any`, which would otherwise
 * make `keyof T` resolve to `string | number` instead of a union of literal keys.
 *
 * @template T - The type from which to remove index signatures
 *
 * @example
 * interface MyType {
 *   foo: string;
 *   bar: number;
 *   [key: string]: any;
 * }
 *
 * type Keys = keyof MyType;
 * // Result: string | number
 *
 * type ExplicitKeys = keyof RemoveIndexSignature<MyType>;
 * // Result: "foo" | "bar"
 */
export type RemoveIndexSignature<T> = {
	[K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/**
 * Extracts keys from a type that match a specific condition pattern.
 *
 * @template T - The type from which to extract keys
 * @template Condition - The string pattern that keys must match
 *
 * @example
 * interface Elements {
 *   h1: HTMLHeadingElement;
 *   h2: HTMLHeadingElement;
 *   h3: HTMLHeadingElement;
 *   div: HTMLDivElement;
 *   span: HTMLSpanElement;
 * }
 *
 * type HeadingKeys = ConditionalKeys<Elements, `h${number}`>;
 * // Result: "h1" | "h2" | "h3"
 */
export type ConditionalKeys<T, Condition> = {
	[K in keyof T]: K extends Condition ? K : never;
}[keyof T];

// ===== GLOBAL TYPES

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
	expandState: Replace<Lowercase<(typeof expandStates)[number]>, " ", "-">;
};
export const releasesTypes = ["All", "Major", "Minor", "Patch"] as const;
export const expandStates = ["Expand all", "Smart", "Collapse all"] as const;
