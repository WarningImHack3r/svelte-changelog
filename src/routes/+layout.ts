import type { Repo, Tab } from "$lib/types";
import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";

injectSpeedInsights();

const repos: Record<Tab, { name: string; repos: Repo[] }> = {
	svelte: {
		name: "Svelte",
		repos: [
			{
				repoName: "svelte",
				versionFromTag: tag => tag.substring(tag.indexOf("@") + 1)
			}
		]
	},
	kit: {
		name: "SvelteKit",
		repos: [
			{
				repoName: "kit",
				dataFilter: ({ tag_name }) => tag_name.includes("/kit@"),
				versionFromTag: tag => tag.substring(tag.lastIndexOf("@") + 1)
			}
		]
	},
	others: {
		name: "Other",
		repos: [
			{
				repoName: "kit",
				dataFilter: ({ tag_name }) => !tag_name.includes("/kit@"),
				versionFromTag: tag => tag.substring(tag.lastIndexOf("@") + 1)
			},
			{
				repoName: "cli",
				versionFromTag: tag => tag.substring(tag.lastIndexOf("@") + 1)
			},
			{
				repoName: "vite-plugin-svelte",
				versionFromTag: tag => tag.substring(tag.lastIndexOf("@") + 1)
			},
			{
				repoName: "eslint-plugin-svelte",
				versionFromTag: tag =>
					tag.includes("@") ? tag.substring(tag.lastIndexOf("@") + 1) : tag.replace(/^v/, "")
			},
			{
				repoName: "eslint-config",
				versionFromTag: tag => tag.replace(/^v/, "")
			},
			{
				repoName: "svelte-eslint-parser",
				versionFromTag: tag => tag.replace(/^v/, "")
			},
			{
				repoName: "language-tools",
				versionFromTag: tag => tag.substring(tag.lastIndexOf("-") + 1)
			},
			{
				repoName: "svelte-devtools",
				versionFromTag: tag => tag.replace(/^v/, "")
			},
			{
				changesMode: "changelog",
				repoName: "svelte-preprocess",
				versionFromTag: tag => tag.replace(/^v/, ""),
				changelogContentsReplacer: file => file.replace(/^# \[/gm, "## [")
			},
			{
				changesMode: "changelog",
				repoName: "rollup-plugin-svelte",
				versionFromTag: tag => tag.replace(/^v/, "")
			},
			{
				changesMode: "changelog",
				repoName: "prettier-plugin-svelte",
				versionFromTag: tag => tag.replace(/^v/, "")
			}
		]
	}
};

export function load() {
	return { repos };
}
