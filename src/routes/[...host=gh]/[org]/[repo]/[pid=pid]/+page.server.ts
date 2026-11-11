import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { siteName } from "#lib/properties.js";
import { pidFormatter } from "#lib/strings.js";

export function load({ params: { org, repo, pid } }) {
	const element = pidFormatter.toHumanReadable(pid).toLowerCase();
	error(400, `Unable to determine the ${element} to visit`, {
		description: `Please specify the exact ${element} link to display in ${siteName}.`,
		links: [
			{
				text: "Go home",
				href: resolve("/")
			},
			{
				text: `Visit ${org}/${repo} on GitHub`,
				href: `https://github.com/${org}/${repo}`
			}
		]
	});
}
