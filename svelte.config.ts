import type { Config } from "@sveltejs/kit";
import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config: Config = {
	preprocess: [vitePreprocess()],
	kit: {
		adapter: adapter(),
		// Required for PostHog — https://posthog.com/docs/libraries/svelte#configuring-session-replay-for-server-side-rendered-apps
		paths: {
			relative: false
		}
	}
};

export default config;
