import { error, redirect } from "@sveltejs/kit";
import { github } from "$lib/server/auth";
import { oauthCookieKey, tokenKey } from "$lib/types";

export async function load({ cookies, url }) {
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookies.get(oauthCookieKey) ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		error(400);
	}
	cookies.delete(oauthCookieKey, {
		path: "/"
	});

	try {
		const tokens = await github.validateAuthorizationCode(code);
		redirect(302, `/?${tokenKey}=${tokens.accessToken()}`);
	} catch {
		error(500);
	}
}
