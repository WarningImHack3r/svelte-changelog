import type { Category, Entries, Prettify, RepoInfo } from "$lib/types";

export const repos: Record<Category, { name: string; repos: RepoInfo[] }> = {
	svelte: {
		name: "Svelte",
		repos: [
			{
				repoName: "svelte",
				metadataFromTag: splitByLastAt
			}
		]
	},
	kit: {
		name: "SvelteKit",
		repos: [
			{
				repoName: "kit",
				dataFilter: ({ tag_name }) => tag_name.includes("/kit@"),
				metadataFromTag: splitByLastAt
			}
		]
	},
	others: {
		name: "Other",
		repos: [
			{
				repoName: "kit",
				dataFilter: ({ tag_name }) => !tag_name.includes("/kit@"),
				metadataFromTag: splitByLastAt
			},
			{
				repoName: "cli",
				metadataFromTag: splitByLastAt
			},
			{
				repoName: "vite-plugin-svelte",
				metadataFromTag: splitByLastAt
			},
			{
				repoName: "eslint-plugin-svelte",
				metadataFromTag(tag) {
					if (tag.includes("@")) {
						return splitByLastAt(tag);
					}
					return [this.repoName, tag.replace(/^v/, "")];
				}
			},
			{
				repoName: "eslint-config",
				metadataFromTag(tag) {
					return [this.repoName, tag.replace(/^v/, "")];
				}
			},
			{
				repoName: "svelte-eslint-parser",
				metadataFromTag(tag) {
					return [this.repoName, tag.replace(/^v/, "")];
				}
			},
			{
				repoName: "language-tools",
				metadataFromTag: tag => {
					const lastIndex = tag.lastIndexOf("-");
					return [tag.substring(0, lastIndex), tag.substring(lastIndex + 1)];
				}
			},
			{
				repoName: "acorn-typescript",
				metadataFromTag(tag) {
					return [this.repoName, tag.replace(/^v/, "")];
				}
			},
			{
				repoName: "svelte-devtools",
				metadataFromTag(tag) {
					return [this.repoName, tag.replace(/^v/, "")];
				}
			},
			{
				changesMode: "changelog",
				repoName: "svelte-preprocess",
				metadataFromTag(tag) {
					return [this.repoName, tag.replace(/^v/, "")];
				},
				changelogContentsReplacer: file => file.replace(/^# \[/gm, "## [")
			},
			{
				changesMode: "changelog",
				repoName: "rollup-plugin-svelte",
				metadataFromTag(tag) {
					return [this.repoName, tag.replace(/^v/, "")];
				}
			},
			{
				changesMode: "changelog",
				repoName: "prettier-plugin-svelte",
				metadataFromTag(tag) {
					return [this.repoName, tag.replace(/^v/, "")];
				}
			}
		]
	}
};

/**
 * A convenience helper to split a string into two parts
 * from its last occurrence of the `@` symbol.
 *
 * @param s the input string
 * @returns an array of length 2 with the two split elements
 */
function splitByLastAt(s: string): [string, string] {
	const lastIndex = s.lastIndexOf("@");
	return [s.substring(0, lastIndex), s.substring(lastIndex + 1)];
}

/**
 * Get all repositories as entries for ease of use
 * and iteration.
 *
 * @example
 * const [id, { name, repos }] = repositories;
 */
export const iterableRepos = Object.entries(repos) as unknown as Entries<typeof repos>;

/**
 * A type storing all the repo information
 * in a standard format
 */
export type Repository = Prettify<
	{
		category: {
			slug: string;
			name: string;
		};
		owner: string;
	} & RepoInfo
>;

/**
 * Get all the repositories in a standard format
 */
export const publicRepos: Repository[] = iterableRepos.flatMap(([slug, { name, repos }]) =>
	repos.map(repo => ({
		category: {
			slug,
			name
		},
		owner: "sveltejs",
		...repo
	}))
);

/**
 * A utility function to only keep unique items in
 * an array, based on the uniqTransform parameter.
 *
 * @param arr the input array
 * @param uniqTransform the transformation function
 * to make items unique
 * @returns the filtered array, containing only unique items
 *
 * @see {@link https://stackoverflow.com/a/70503699/12070367|Original implementation}
 */
function uniq<T, U>(arr: T[], uniqTransform: (item: T) => U) {
	const track = new Set<U>();
	return arr.filter(item => {
		const value = uniqTransform(item);
		return track.has(value) ? false : track.add(value);
	});
}

/**
 * Return a unique array of owner and name of
 * the available repositories
 */
export const uniqueRepos = uniq(
	iterableRepos.flatMap(([, { repos }]) =>
		repos.map(({ repoName }) => ({
			owner: "sveltejs",
			name: repoName
		}))
	),
	({ owner, name }) => `${owner}/${name}`
);
