import { github } from "$lib/server/auth";

export async function GET({ cookies, url }) {
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookies.get("github_oauth_state") ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}
	cookies.delete("github_oauth_state", {
		path: "/"
	});

	const tokens = await github.validateAuthorizationCode(code);

	return new Response(null, {
		status: 302,
		headers: {
			Location: "/?token=" + tokens.accessToken
		}
	});
}
