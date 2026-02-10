import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { siteName } from "$lib/properties";

export function load() {
	error(400, {
		message: "Unable to visit a repository",
		description: `Paste a whole PR/issue/discussion link to display it in ${siteName}.`,
		link: {
			text: "Go home",
			href: resolve("/")
		}
	});
}
