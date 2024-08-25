import { dev } from "$app/environment";
import { env } from "$env/dynamic/public";
import { Octokit } from "octokit";
import { localStorageStore } from "./localStorageStore";
import { tokenKey } from "./types";

/**
 * Creates an Octokit instance with the current user's access token.
 * If the user is not logged in, the new instance will be created without authentication.
 * In development mode, the instance will be created with the access token
 * from the environment if it is available, overriding the user's access token.
 */
export function getOctokit() {
	// TODO: Invert the condition to make the logged in token take precedence over the environment token
	const hasTokenInDev = dev && env.PUBLIC_GITHUB_TOKEN;
	const octokit = new Octokit(
		hasTokenInDev
			? {
					auth: env.PUBLIC_GITHUB_TOKEN
				}
			: undefined
	);
	if (hasTokenInDev) return octokit;
	const unsubscribe = localStorageStore(tokenKey, "").subscribe(token => {
		if (!token) return;
		octokit.hook.wrap("request", async (request, options) => {
			unsubscribe();
			options.headers.authorization = `token ${token}`;

			return request(options);
		});
	});
	return octokit;
}
