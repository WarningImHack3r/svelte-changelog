import posthog from "posthog-js";
import { dfatal } from "$lib/debug";
import { stringify } from "$lib/errors";

export function handleError({ error, status, event, message }) {
	if (status === 404) return;
	const stringified = stringify(error);
	dfatal(`[CLIENT][${status}] ${stringified}`);
	posthog.captureException(error instanceof Error ? error : new Error(stringified), {
		...event,
		status_code: status,
		error_message: message
	});
}
