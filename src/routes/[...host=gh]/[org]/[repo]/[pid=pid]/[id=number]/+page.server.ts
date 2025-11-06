import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load({ params: { org, repo, pid, id } }) {
	redirect(
		307,
		resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
			pid,
			org,
			repo,
			id
		})
	);
}
