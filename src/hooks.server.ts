import { context, isSpanContextValid, trace } from "@opentelemetry/api";
import { enrichCurrentSpan } from "posthog-node/otel";
import { dfatal } from "#lib/logging.js";
import { client } from "#lib/server/posthog.js";
import { stringifyError } from "#lib/strings.js";

export async function handleError({ kind, error, event }) {
	if (kind === "app" || kind === "framework") return;
	const stringified = stringifyError(error);
	dfatal(`[SERVER] ${stringified}`);
	client?.captureException(error instanceof Error ? error : new Error(stringified), {
		distinctId: event.locals.posthogError?.distinctId,
		properties: event.locals.posthogError?.properties
	});
	await client?.flush();
}

const POSTHOG_PATHNAME_PREFIX = "/ingest";
const POSTHOG_PATHNAME_PREFIX_REGEX = new RegExp(`^${POSTHOG_PATHNAME_PREFIX}`);
const POSTHOG_BEARER_REGEX = /^Bearer ph[csx]_/;

function tracingId(value: string | null | undefined) {
	return (
		value
			?.replace(/\p{Cc}/gu, "")
			.trim()
			.slice(0, 1000) || undefined
	);
}

export async function handle({ event, resolve }) {
	/**
	 * Reverse proxy for PostHog
	 * Source: https://posthog.com/docs/advanced/proxy/sveltekit#create-the-server-hook
	 */
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
		// Remove cookies before forwarding to PostHog
		headers.delete("cookie");
		/**
		 * Forward PostHog keys (Bearer phc_, phs_ or phx_), which the SDKs need. Strip any other credentials.
		 * To allow an older key without one of these prefixes, also match its exact 'Bearer <key>' value.
		 */
		if (!POSTHOG_BEARER_REGEX.test(headers.get("authorization") ?? "")) {
			headers.delete("authorization");
		}
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

	/**
	 * Server span context for PostHog
	 * Source: https://posthog.com/docs/libraries/svelte#server-span-context
	 */
	if (client) {
		event.locals.posthog = client;

		const existing = client.getContext();
		const data = {
			distinctId:
				existing?.distinctId ?? tracingId(event.request.headers.get("x-posthog-distinct-id")),
			sessionId: existing?.sessionId ?? tracingId(event.request.headers.get("x-posthog-session-id"))
		};
		const spanContext = event.tracing.root.spanContext();
		event.locals.posthogError = {
			distinctId: data.distinctId,
			properties: {
				...(data.sessionId ? { $session_id: data.sessionId } : {}),
				...(event.tracing.enabled && isSpanContextValid(spanContext)
					? { $trace_id: spanContext.traceId, $span_id: spanContext.spanId }
					: {})
			}
    };

		return client.withContext(
			data,
			async () => {
				if (client) {
					if (event.tracing.enabled) {
						context.with(trace.setSpan(context.active(), event.tracing.root), () => {
							if (client) enrichCurrentSpan(client);
						});
					}
					enrichCurrentSpan(client);
				}
				return await resolve(event);
			},
			{ fresh: true }
		);
	}

	return await resolve(event);
}
