import type { RepoInfo, Category } from "$lib/types";

const repos: Record<Category, { name: string; repos: RepoInfo[] }> = {
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

type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

/**
 * Get all repositories as entries for ease of use
 * and iteration.
 *
 * @example
 * const [id, { name, repos }] = repositories;
 */
export const repositories = Object.entries(repos) as unknown as Entries<typeof repos>;

/**
 * Get all a record of all GitHub repositories
 * from the collection.
 */
export const githubRepos = {
	sveltejs: [...new Set(repositories.flatMap(([, { repos }]) => repos.map(r => r.repoName)))]
};
