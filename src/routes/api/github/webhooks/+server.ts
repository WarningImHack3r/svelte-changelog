import { WEBHOOKS_SECRET } from "$env/static/private";
import { Webhooks, createWebMiddleware } from "@octokit/webhooks";
import { ddebug as debug, derror as error, dlog as info, dwarn as warn } from "$lib/debug";
import { githubCache } from "$lib/server/github-cache";

const webhooks = new Webhooks({
	secret: WEBHOOKS_SECRET ?? ""
});

webhooks.on(["release.released", "release.prereleased"], async ({ name, payload }) => {
	const owner = payload.repository.owner.login;
	const repo = payload.repository.name;
	info(`Received a webhook for "${name}", invalidating repo ${owner}/${repo}`);
	const deleted = await githubCache.deleteRepoEntry(owner, repo, "releases");
	if (deleted) {
		info(`Successfully deleted the entry for ${owner}/${repo}`);
	} else {
		error(`Failed to delete the entry for ${owner}/${repo}`);
	}
});

// Web middleware = `fetch` API-compatible / Node middleware = Node server compatible
const middleware = createWebMiddleware(webhooks, {
	log: { debug, info, warn, error }
});

// Types on this middleware function are quite awful
// - 1st arg (request): either a `Request` for web middleware, or `http.IncomingMessage` for node
// - 2nd arg (response): either a `Response` for web middleware, or `http.ServerResponse` for node
//   - [node] the argument IS mandatory despite the type
//   - [web] the argument isn't used
// - 3rd arg (next): (only) called if the `path` from the `create` function isn't the same as in the request
// - return type: a success `boolean` for node middleware (and populates response arg), or the `Response` for web
export const POST = async ({ request }) => await middleware(request);
