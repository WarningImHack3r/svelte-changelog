import posthog from "posthog-js";
import { dfatal } from "#lib/logging.js";
import { stringifyError } from "#lib/strings.js";

export function handleError({ kind, error, event }) {
	if (kind === "app" || kind === "framework") return;

	const stringified = stringifyError(error);
	dfatal(`[CLIENT] ${stringified}`);
	posthog.captureException(error instanceof Error ? error : new Error(stringified), event);
}
