import { error } from "@sveltejs/kit";

export async function load({ parent, params }) {
	const { octokit } = await parent();
	const { pullOrIssue, org, repo, id } = params;

	const poiName = pullOrIssue === "pull" ? "pulls" : "issues";
	await octokit.request(`GET /repos/${org}/${repo}/${poiName}/${id}`).catch(() => error(404));

	return {
		pullOrIssue: pullOrIssue as "pull" | "issues",
		org,
		repo,
		id: Number(id)
	};
}
