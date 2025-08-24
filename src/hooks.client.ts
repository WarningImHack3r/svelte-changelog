import posthog from "posthog-js";

export function handleError({ error, status, event }) {
	if (status === 404) return;
	console.error(`[CLIENT] ${error}`);
	posthog.captureException(error, event);
}
