import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { siteName } from "$lib/properties";
import { pidFormatter } from "$lib/strings";

export function load({ params: { pid } }) {
	const element = pidFormatter.toHumanReadable(pid).toLowerCase();
	error(400, {
		message: `Unable to determine the ${element} to visit`,
		description: `Please specify the exact ${element} link to display in ${siteName}.`,
		link: {
			text: "Go home",
			href: resolve("/")
		}
	});
}
