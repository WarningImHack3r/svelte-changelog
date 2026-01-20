import adapter from "@sveltejs/adapter-vercel";

/** @type {import("@sveltejs/kit").Config} */
const config = {
	kit: {
		adapter: adapter(),
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
