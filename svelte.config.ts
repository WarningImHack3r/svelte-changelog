import type { Config } from "@sveltejs/kit";
import adapter from "@sveltejs/adapter-node";

const config: Config = {
	kit: {
		adapter: adapter(),
		// Required for PostHog — https://posthog.com/docs/libraries/svelte#configuring-session-replay-for-server-side-rendered-apps
		paths: { relative: false },
		experimental: { instrumentation: { server: true } }
	}
};

export default config;
