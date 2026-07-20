import { defineEnvVars } from "@sveltejs/kit/env";
import * as v from "valibot";

const USUAL_TOKEN_REGEX = /^[a-z]+_[A-Za-z\d]+$/;
const DASHLESS_UUID_LIKE_REGEX = /^[\da-f]+$/;

export const variables = defineEnvVars({
	// PostHog
	POSTHOG_KEY: {
		public: true,
		description: "The PostHog key for posthog-js analytics",
		schema: v.optional(v.pipe(v.string(), v.regex(USUAL_TOKEN_REGEX)))
	},
	POSTHOG_ENV_ID: {
		description: "The project id for this project on PostHog; only used at build-time",
		schema: v.optional(
			v.pipe(
				v.string(),
				v.regex(v.DIGITS_REGEX),
				v.transform(id => +id)
			)
		)
	},
	POSTHOG_SOURCEMAP_API_KEY: {
		description: "The API key for uploading sourcemaps to PostHog; only used at build-time",
		schema: v.optional(v.pipe(v.string(), v.regex(USUAL_TOKEN_REGEX)))
	},
	/*
	 * GitHub API
	 * Use either GITHUB_TOKEN, or the other 3 together.
	 * Not using any of those 4 will prevent the app from starting.
	 */
	GH_APP_ID: {
		static: true,
		description: "GitHub's app ID for creating an Octokit App",
		schema: v.optional(
			v.pipe(
				v.string(),
				v.regex(v.DIGITS_REGEX),
				v.transform(id => +id)
			)
		)
	},
	GH_APP_INSTALLATION_ID: {
		static: true,
		description: "GitHub's app installation ID for getting an Octokit client from an App",
		schema: v.optional(
			v.pipe(
				v.string(),
				v.regex(v.DIGITS_REGEX),
				v.transform(id => +id)
			)
		)
	},
	GH_APP_PRIV_KEY_BASE64: {
		static: true,
		description: "The private key to create a GitHub app, encoded in base64",
		schema: v.optional(v.pipe(v.string(), v.regex(v.BASE64_REGEX)))
	},
	GITHUB_TOKEN: {
		/*
		 * I use a classic token with everything read-only (public_repo, read:discussion, read:enterprise, read:org, read:project, read:public_key, read:user, repo:status & user:email).
		 * Realistically, you should only need public_repo, read:discussion, read:org, read:user, repo:status & user:email.
		 */
		static: true,
		description: "The GitHub token for local development",
		schema: v.optional(v.pipe(v.string(), v.regex(USUAL_TOKEN_REGEX)))
	},
	// Cloudflare
	CLOUDFLARE_ZONE_ID: {
		static: true,
		description: "Cloudflare's zone ID for caching purposes",
		schema: v.optional(v.pipe(v.string(), v.regex(DASHLESS_UUID_LIKE_REGEX)))
	},
	CLOUDFLARE_API_TOKEN: {
		static: true,
		description: "Cloudflare's API token for caching purposes",
		schema: v.optional(v.pipe(v.string(), v.regex(USUAL_TOKEN_REGEX)))
	},
	// Redis cache
	REDIS_URL: {
		static: true,
		description:
			"A TCP URL to a Redis instance; leaving it empty uses in-memory caching for development purposes",
		schema: v.optional(v.pipe(v.string(), v.url()))
	},
	REDIS_ALLOW_SELF_SIGNED: {
		static: true,
		description:
			"Whether to allow self-signed certificates from the Redis server; only applicable if the Redis URL uses TLS (rediss://)",
		schema: v.pipe(
			v.optional(v.picklist(["true", "false"]), "false"),
			v.transform(str => str === "true")
		)
	},
	// Webhook reception
	WEBHOOKS_REPLICATOR_TOKEN: {
		static: true,
		description: "The token for webhook reception; only received on prod domain, ignore on dev",
		schema: v.optional(v.pipe(v.string(), v.regex(v.BASE64_REGEX)))
	},
	// Meta (not the company)
	ENVIRONMENT: {
		static: true,
		description: "The current execution environment",
		schema: v.optional(v.picklist(["production", "preview", "development"]), "development")
	}
});
