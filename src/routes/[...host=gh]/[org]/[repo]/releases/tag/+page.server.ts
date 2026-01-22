import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load() {
	error(403, {
		message: "The tag needs to be specified",
		description:
			"You can use this redirection feature only from a direct exact release or from an issue, PR or discussion.",
		link: {
			text: "Go home",
			href: resolve("/")
		}
	});
}
