import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load() {
	error(400, {
		message: "Unable to visit releases directly",
		description: "The desired package (and version) are needed to proceed.",
		link: {
			text: "Go home",
			href: resolve("/")
		}
	});
}
