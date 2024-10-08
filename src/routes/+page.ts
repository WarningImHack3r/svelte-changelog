import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { tokenKey } from "$lib/types";

export function load({ url }) {
	if (!browser) return;

	// Login redirect
	const token = url.searchParams.get(tokenKey);
	if (token) {
		localStorage.setItem(tokenKey, token);
		redirect(302, "/");
	}
}
