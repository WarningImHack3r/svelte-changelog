import { dev } from "$app/environment";
import { PUBLIC_POSTHOG_KEY } from "$env/static/public";
import { PostHog } from "posthog-node";

const client = new PostHog(PUBLIC_POSTHOG_KEY, {
	host: "https://eu.i.posthog.com",
	disabled: dev
});

export async function handleError({ error, status, event }) {
	if (status !== 404) {
		client.captureException(error, undefined, event);
		await client.shutdown();
	}
}

export async function handle({ event, resolve }) {
	event.locals.posthog = client;
	return await resolve(event);
}
