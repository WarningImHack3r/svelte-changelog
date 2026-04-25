import type { Config } from "@sveltejs/kit";
import adapter from "adapter-node-sea";

const config: Config = {
	kit: {
		adapter: adapter({ minify: true }),
		// Required for PostHog — https://posthog.com/docs/libraries/svelte#configuring-session-replay-for-server-side-rendered-apps
		paths: {
			relative: false
		},
		experimental: {
			instrumentation: {
				server: true
			}
		}
	}
};

export default config;
