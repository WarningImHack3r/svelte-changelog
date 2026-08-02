import { sveltekit } from "@sveltejs/kit/vite";
import { svelteDevtools } from "@sveltejs/vite-devtools-svelte";
import posthog from "@posthog/rollup-plugin";
import tailwindcss from "@tailwindcss/vite";
import adapter from "adapter-node-sea";
import { sep } from "node:path";
import { shaker } from "svelte-shaker/vite";
import { defineConfig, loadEnv } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		build: {
			rolldownOptions: {
				devtools: {}
			}
		},
		devtools: process.env.ESLINT_RUN ? undefined : { apply: "serve" },
		plugins: [
			devtoolsJson(),
			lucidePreprocess(),
			shaker({ verbose: true }),
			svelteDevtools(),
			sveltekit({
				// Force runes mode for the project, except for libraries. Can be removed in Svelte 6.
				compilerOptions: {
					runes: ({ filename }) => (filename.split(sep).includes("node_modules") ? undefined : true)
				},
				adapter: adapter(),
				tracing: {
					server: true
				},
				paths: {
					// Required for PostHog — https://posthog.com/docs/libraries/svelte#configuring-session-replay-for-server-side-rendered-apps
					relative: false
				},
				compilerOptions: {
					experimental: {
						async: true
					}
				},
				experimental: {
					remoteFunctions: true,
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
		],
		ssr: {
			noExternal: ["tw-animate-css"]
		}
	};
});
