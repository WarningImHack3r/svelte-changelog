import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { siteName } from "$lib/properties";

export function load({ params: { pid: type } }) {
	const element =
		type === "issues" ? "issue" : type === "discussions" ? "discussion" : "pull request";
	error(400, {
		message: `Unable to determine the ${element} to visit`,
		description: `Please specify the exact ${element} link to display in ${siteName}.`,
		link: {
			text: "Go home",
			href: resolve("/")
		}
	});
}
