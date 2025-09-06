import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { uniqueRepos } from "$lib/repositories";

export function load() {
	// Load the first repo of our list
	const firstRepo = uniqueRepos[0];
	if (!firstRepo) redirect(307, resolve("/"));
	redirect(307, resolve("/tracker/[org]/[repo]", { org: firstRepo.owner, repo: firstRepo.name }));
}
