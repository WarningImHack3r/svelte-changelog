import posthog from "posthog-js";

export function handleError({ error, status }) {
	if (status === 404) return;
	posthog.captureException(error);
}
