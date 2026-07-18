import { POSTHOG_KEY } from "$app/env/public";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { siteRepoName } from "#lib/properties";

const sdk = new NodeSDK({
	resource: resourceFromAttributes({
		"service.name": siteRepoName
	}),
	logRecordProcessors: POSTHOG_KEY
		? [
				new BatchLogRecordProcessor(
					new OTLPLogExporter({
						url: "https://eu.i.posthog.com/i/v1/logs",
						headers: {
							Authorization: `Bearer ${POSTHOG_KEY}`
						}
					})
				)
			]
		: undefined
});

sdk.start();
