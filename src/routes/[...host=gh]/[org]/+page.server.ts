import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { siteName } from "$lib/properties";

export function load({ params }) {
	error(400, {
		message: "Unable to visit an organization/user",
		description: `Paste a whole PR/issue/discussion link to display it in ${siteName}.`,
		links: [
			{
				text: "Go home",
				href: resolve("/")
			},
			{
				text: `Visit ${params.org} on GitHub`,
				href: `https://github.com/${params.org}`
			}
		]
	});
}
