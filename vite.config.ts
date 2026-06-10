import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-node";
import posthog from "@posthog/rollup-plugin";
import tailwindcss from "@tailwindcss/vite";
import { shaker } from "svelte-shaker/vite";
import { defineConfig, loadEnv } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [
			devtoolsJson(),
			lucidePreprocess(),
			shaker(),
			sveltekit({
				adapter: adapter(),
				// Required for PostHog — https://posthog.com/docs/libraries/svelte#configuring-session-replay-for-server-side-rendered-apps
				paths: {
					relative: false
				},
				experimental: {
					instrumentation: {
						server: true
					},
					explicitEnvironmentVariables: true
				}
			}),
			tailwindcss(),
			env.POSTHOG_ENV_ID && env.POSTHOG_SOURCEMAP_API_KEY && env.ENVIRONMENT === "production"
				? posthog({
						personalApiKey: env.POSTHOG_SOURCEMAP_API_KEY,
						projectId: env.POSTHOG_ENV_ID,
						host: "https://eu.i.posthog.com"
					})
				: undefined
		]
	};
});
