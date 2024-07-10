import { error } from "@sveltejs/kit";

export async function load({ params, fetch }) {
	const { pullOrIssue, org, repo, id } = params;

	const poiName = pullOrIssue === "pull" ? "pulls" : "issues";
	const isUrlOk = (await fetch(`https://api.github.com/repos/${org}/${repo}/${poiName}/${id}`)).ok;
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
