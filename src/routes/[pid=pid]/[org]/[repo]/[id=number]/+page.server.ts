import { error, redirect } from "@sveltejs/kit";
import { gitHubCache } from "$lib/server/github-cache";

export async function load({ params }) {
	const { pid: type, org, repo, id } = params;
	const numId = +id; // id is already validated by the route matcher

	const item = await gitHubCache.getItemDetails(org, repo, numId);
	if (!item) {
		error(404, `${type} #${id} doesn't exist in repo ${org}/${repo}`);
	}

	const realType = "commits" in item ? "pull" : "issues";
	if (type !== realType) {
		redirect(303, `/${realType}/${org}/${repo}/${id}`);
	}

	return {
		itemMetadata: {
			org,
			repo,
			id: numId,
			type: type === "issues" ? ("issue" as const) : ("pull" as const)
		},
		item
	};
}
