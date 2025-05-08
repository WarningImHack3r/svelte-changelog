import { redirect } from "@sveltejs/kit";
import { uniqueRepos } from "$lib/repositories";

export function load({ url }) {
	// Load the first repo of our list
	const firstRepo = uniqueRepos[0];
	if (!firstRepo) redirect(307, "/");
	redirect(307, `${url.pathname}/${firstRepo.owner}/${firstRepo.name}`);
}
