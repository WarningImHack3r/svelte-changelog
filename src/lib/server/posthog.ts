import { dev } from "$app/env";
import { POSTHOG_KEY } from "$app/env/public";
import { PostHog } from "posthog-node";

export const client = POSTHOG_KEY
	? new PostHog(POSTHOG_KEY, {
			host: "https://eu.i.posthog.com",
			disabled: dev
		})
	: undefined;
