import { dev } from "$app/environment";
import { env } from "$env/dynamic/public";
import type { Repo, Tab } from "../types";
import { Octokit } from "octokit";
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
				versionFromTag: tag => tag.substring(tag.indexOf("@") + 1)
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
			}
		]
	}
};

export function load() {
	return {
		repos,
		octokit: new Octokit(
			dev && env.PUBLIC_GITHUB_TOKEN
				? {
						auth: env.PUBLIC_GITHUB_TOKEN
					}
				: undefined
		)
	};
}
