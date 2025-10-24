import posthog from "posthog-js";
import { derror } from "$lib/debug";

export function handleError({ error, status, event }) {
	if (status === 404) return;
	derror(`[CLIENT] ${error}`);
	posthog.captureException(error, event);
}
