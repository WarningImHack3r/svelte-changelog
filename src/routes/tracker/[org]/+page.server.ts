import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { uniqueRepos } from "$lib/repositories";

export function load({ params }) {
	// Load the first repo that has the org
	const matchingRepo = uniqueRepos.find(
		({ owner }) => owner.localeCompare(params.org, undefined, { sensitivity: "base" }) === 0
	);
	if (!matchingRepo) redirect(307, resolve("/"));
	const { owner: org, name: repo } = matchingRepo;
	redirect(307, resolve("/tracker/[org]/[repo]", { org, repo }));
}
