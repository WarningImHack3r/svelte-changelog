import { dev } from "$app/environment";
import { PUBLIC_POSTHOG_KEY } from "$env/static/public";
import { PostHog } from "posthog-node";
import { dfatal } from "$lib/debug";
import { stringify } from "$lib/errors";

const client = new PostHog(PUBLIC_POSTHOG_KEY, {
	host: "https://eu.i.posthog.com",
	disabled: dev
});

export async function handleError({ error, status, event, message }) {
	if (status === 404) return;
	const stringified = stringify(error);
	dfatal(`[SERVER][${status}] ${stringified}`);
	try {
		client.captureException(error instanceof Error ? error : new Error(stringified), undefined, {
			...event,
			status_code: status,
			error_message: message
		});
		await client.shutdown();
	} catch {
		// Mitigate https://github.com/PostHog/posthog-js/issues/2615
	}
}

export async function handle({ event, resolve }) {
	event.locals.posthog = client;
	return await resolve(event);
}
