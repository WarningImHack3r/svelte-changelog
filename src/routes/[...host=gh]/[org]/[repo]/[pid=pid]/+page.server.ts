import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load({ params: { pid: type } }) {
	const element =
		type === "issues" ? "issue" : type === "discussions" ? "discussion" : "pull request";
	error(403, {
		message: `Unable to determine the ${element} to visit`,
		description: `Please specify the exact ${element} link to display in Svelte Changelog.`,
		link: {
			text: "Go home",
			href: resolve("/")
		}
	});
}
