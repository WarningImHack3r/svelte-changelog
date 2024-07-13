import { dev } from "$app/environment";
import { env } from "$env/dynamic/public";
import { error } from "@sveltejs/kit";

export async function load({ params, fetch }) {
	const { pullOrIssue, org, repo, id } = params;

	const poiName = pullOrIssue === "pull" ? "pulls" : "issues";
	const isUrlOk = (
		await fetch(`https://api.github.com/repos/${org}/${repo}/${poiName}/${id}`, {
			headers:
				dev && env.PUBLIC_GITHUB_TOKEN
					? {
							Authorization: `token ${env.PUBLIC_GITHUB_TOKEN}`
						}
					: undefined
		})
	).ok;
	if (!isUrlOk) {
		error(404);
	}

	return {
		pullOrIssue: pullOrIssue as "pull" | "issues",
		org,
		repo,
		id: Number(id)
	};
}
