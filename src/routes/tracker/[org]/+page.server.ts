import { redirect } from "@sveltejs/kit";
import { uniqueRepos } from "$lib/repositories";

export function load({ params }) {
	// Load the first repo that has the org
	const matchingRepo = uniqueRepos.find(
		({ owner }) => owner.localeCompare(params.org, undefined, { sensitivity: "base" }) === 0
	);
	if (!matchingRepo) redirect(307, "/");
	redirect(307, `/tracker/${matchingRepo.owner}/${matchingRepo.name}`);
}
