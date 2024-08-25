import { error } from "@sveltejs/kit";
import { getOctokit } from "$lib/octokit";

export async function load({ params }) {
	const { pullOrIssue, org, repo, id } = params;

	const poiName = pullOrIssue === "pull" ? "pulls" : "issues";
	await getOctokit()
		.request(`GET /repos/${org}/${repo}/${poiName}/${id}`)
		.catch(() => error(404));

	return {
		pullOrIssue: pullOrIssue as "pull" | "issues",
		org,
		repo,
		id: Number(id)
	};
}
