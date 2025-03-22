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
 * Get a record of all GitHub repositories
 * from the collection, as an "owner-to-repo-names"
 * map.
 */
export const githubRepos = {
	sveltejs: [...new Set(repositories.flatMap(([, { repos }]) => repos.map(r => r.repoName)))]
};

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
 * Get a list of objects containing
 * the repo owner, the repo name, and the
 * associated transformation function to
 * transform a release tag name into a package
 * name.
 */
export const transformationRepos = uniq(
	repositories.flatMap(([, { repos }]) =>
		repos.map(r => ({
			owner: "sveltejs",
			repoName: r.repoName,
			tagToName: (tag: string) => {
				const [name] = r.metadataFromTag(tag);
				return name;
			}
		}))
	),
	item => item.repoName
);
