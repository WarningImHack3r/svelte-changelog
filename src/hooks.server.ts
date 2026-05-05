import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { dev } from "$app/environment";
import { PUBLIC_POSTHOG_KEY } from "$env/static/public";
import { PostHog } from "posthog-node";
import { dfatal } from "$lib/logging";
import { api } from "$lib/server/remultApi";
import { stringifyError } from "$lib/strings";

const client = new PostHog(PUBLIC_POSTHOG_KEY, {
	host: "https://eu.i.posthog.com",
	disabled: dev
});

export async function handleError({ error, status, event, message }) {
	if (status === 404) return;
	const stringified = stringifyError(error);
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

const POSTHOG_PATHNAME_PREFIX = "/ingest";
const POSTHOG_PATHNAME_PREFIX_REGEX = new RegExp(`^${POSTHOG_PATHNAME_PREFIX}`);

const appHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith(POSTHOG_PATHNAME_PREFIX)) {
		const useAssetHost =
			event.url.pathname.startsWith(`${POSTHOG_PATHNAME_PREFIX}/static/`) ||
			event.url.pathname.startsWith(`${POSTHOG_PATHNAME_PREFIX}/array/`);
		const hostname = useAssetHost ? "eu-assets.i.posthog.com" : "eu.i.posthog.com";

		const url = new URL(event.request.url);
		url.protocol = "https:";
		url.hostname = hostname;
		url.port = "443";
		url.pathname = event.url.pathname.replace(POSTHOG_PATHNAME_PREFIX_REGEX, "");

		const headers = new Headers(event.request.headers);
		headers.set("host", hostname);
		headers.set("accept-encoding", "");

		// Forward client IP for geolocation
		const clientIp = event.request.headers.get("x-forwarded-for") || event.getClientAddress();
		if (clientIp) {
			headers.set("x-forwarded-for", clientIp);
		}

		return await fetch(url.toString(), {
			method: event.request.method,
			headers,
			body: event.request.body,
			// @ts-expect-error - duplex is required for streaming request bodies
			duplex: "half"
		});
	}

	event.locals.posthog = client;
	return await resolve(event);
};

export const handle = sequence(api, appHandle);
