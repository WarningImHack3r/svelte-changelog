import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load({ params }) {
	error(400, {
		message: "Unable to visit releases directly",
		description: "The desired package (and version) are needed to proceed.",
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
