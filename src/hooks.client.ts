import posthog from "posthog-js";
import { dfatal } from "$lib/logging";
import { stringifyError } from "$lib/strings";

export function handleError({ error, status, event, message }) {
	if (status === 404) return;

	// Mitigate https://github.com/sveltejs/kit/issues/15425
	if (
		status === 500 &&
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		error.status !== status
	)
		return;

	const stringified = stringifyError(error);
	dfatal(`[CLIENT][${status}] ${stringified}`);
	posthog.captureException(error instanceof Error ? error : new Error(stringified), {
		...event,
		status_code: status,
		error_message: message
	});
}
