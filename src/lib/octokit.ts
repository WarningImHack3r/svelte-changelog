import { dev } from "$app/environment";
import { env } from "$env/dynamic/public";
import { Octokit } from "octokit";
import { persisted } from "svelte-persisted-store";
import { plainTextSerializer } from "./stores";
import { tokenKey } from "./types";

let octokit: Octokit;

/**
 * Creates or returns a shared {@link Octokit} instance with the current user's access token.
 * If the user is not logged in, the new instance will be created without authentication.
 * In development mode, the instance will be created with the access token
 * from the environment if it is available, overriding the user's access token.
 */
export function getOctokit() {
	if (octokit) return octokit;
	// TODO: Invert the condition to make the logged in token take precedence over the environment token
	const hasTokenInDev = dev && !!env.PUBLIC_GITHUB_TOKEN;
	octokit = new Octokit(
		hasTokenInDev
			? {
					auth: env.PUBLIC_GITHUB_TOKEN
				}
			: undefined
	);
	if (hasTokenInDev) return octokit;
	const unsubscribe = persisted(tokenKey, "", {
		serializer: plainTextSerializer
	}).subscribe(token => {
		if (!token) return;
		octokit.hook.wrap("request", async (request, options) => {
			unsubscribe();
			options.headers.authorization = `token ${token}`;

			return request(options);
		});
	});
	return octokit;
}
