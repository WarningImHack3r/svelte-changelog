import posthog from "posthog-js";

export function handleError({ error, status, event }) {
	if (status === 404) return;
	posthog.captureException(error, event);
}
