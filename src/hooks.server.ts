import { redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { PUBLIC_POSTHOG_KEY } from "$env/static/public";
import { PostHog } from "posthog-node";

const client = new PostHog(PUBLIC_POSTHOG_KEY, {
	host: "https://eu.i.posthog.com",
	disabled: dev
});

export async function handleError({ error, status, event }) {
	if (status !== 404) {
		console.error(`[SERVER] ${error}`);
		client.captureException(error, undefined, event);
		await client.shutdown();
	}
}

export async function handle({ event, resolve }) {
	if (event.url.pathname === "/blog" || event.url.pathname.startsWith("/blog/")) {
		redirect(307, event.url.pathname.replace(/^\/blog/, "/devlog"));
	}

	event.locals.posthog = client;
	return await resolve(event);
}
