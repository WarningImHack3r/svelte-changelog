import { POSTHOG_KEY } from "$app/env/public";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PostHogContextSpanProcessor } from "posthog-node/otel";
import { siteRepoName } from "#lib/properties.js";
import { client } from "#lib/server/posthog.js";

const sdk = new NodeSDK({
	resource: resourceFromAttributes({
		"service.name": siteRepoName
	}),
	spanProcessors: client ? [new PostHogContextSpanProcessor(client)] : undefined,
	logRecordProcessors: POSTHOG_KEY
		? [
				new BatchLogRecordProcessor({
					exporter: new OTLPLogExporter({
						url: "https://eu.i.posthog.com/i/v1/logs",
						headers: {
							Authorization: `Bearer ${POSTHOG_KEY}`
						}
					})
				})
			]
		: undefined
});

sdk.start();
