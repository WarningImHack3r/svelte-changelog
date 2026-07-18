import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load({ params }) {
	error(400, {
		message: "The tag needs to be specified",
		description:
			"You can use this redirection feature only from a direct exact release or from an issue, PR or discussion.",
		links: [
			{
				text: "Go home",
				href: resolve("/")
			},
			{
				text: `Visit releases of ${params.org}/${params.repo} on GitHub`,
				href: `https://github.com/${params.org}/${params.repo}/releases`
			}
		]
	});
}
