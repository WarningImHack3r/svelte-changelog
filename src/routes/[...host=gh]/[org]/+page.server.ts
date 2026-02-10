import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load() {
	error(400, {
		message: "Unable to visit an organization/user",
		description: "Paste a whole PR/issue/discussion link to display it in Svelte Changelog.",
		link: {
			text: "Go home",
			href: resolve("/")
		}
	});
}
