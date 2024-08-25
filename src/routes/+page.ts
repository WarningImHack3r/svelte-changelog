import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";

export function load({ url }) {
	if (!browser) return;

	const token = url.searchParams.get("token");
	if (token) {
		localStorage.setItem("token", token);
		redirect(302, "/");
	}
}
