import posthog from "posthog-js";
import { dfatal } from "$lib/debug";

export function handleError({ error, status, event, message }) {
	if (status === 404) return;
	dfatal(`[CLIENT] ${error}`);
	posthog.captureException(error, {
		...event,
		status_code: status,
		error_message: message
	});
}
