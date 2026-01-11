import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/kit").Config} */
const config = {
	preprocess: [vitePreprocess()],
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
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
