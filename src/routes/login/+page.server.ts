import { redirect } from "@sveltejs/kit";
import { generateState } from "arctic";
import { github } from "$lib/server/auth";
import { oauthCookieKey } from "$lib/types";

export function load({ cookies }) {
	const state = generateState();
	const url = github.createAuthorizationURL(state, ["public_repo"]);

	cookies.set(oauthCookieKey, state, {
		path: "/",
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax"
	});

	redirect(302, url);
}
