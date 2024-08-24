import { OAuth2RequestError } from "arctic";
import { generateIdFromEntropySize } from "lucia";
import { Octokit } from "octokit";
import { github, lucia } from "$lib/server/auth";

const octokit = new Octokit();

export async function GET({ cookies, url }) {
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookies.get("github_oauth_state") ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}

	try {
		const tokens = await github.validateAuthorizationCode(code);
		const { id, login } = await octokit.rest.users
			.getAuthenticated({
				headers: {
					Authorization: `Bearer ${tokens.accessToken}`
				}
			})
			.then(({ data }) => data);

		// Replace this with your own DB client.
		const existingUser = await db.table("user").where("github_id", "=", id).get();

		if (existingUser) {
			const session = await lucia.createSession(existingUser.id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: ".",
				...sessionCookie.attributes
			});
		} else {
			const userId = generateIdFromEntropySize(10); // 16 characters long

			// Replace this with your own DB client.
			await db.table("user").insert({
				id: userId,
				github_id: id,
				username: login
			});

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: ".",
				...sessionCookie.attributes
			});
		}
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/"
			}
		});
	} catch (e) {
		// the specific error message depends on the provider
		if (e instanceof OAuth2RequestError) {
			// invalid code
			return new Response(null, {
				status: 400
			});
		}
		return new Response(null, {
			status: 500
		});
	}
}
