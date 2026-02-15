import { sveltekit } from "@sveltejs/kit/vite";
import posthog from "@posthog/rollup-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	const POSTHOG_ENV_ID = env.POSTHOG_ENV_ID;
	const POSTHOG_SOURCEMAP_API_KEY = env.POSTHOG_SOURCEMAP_API_KEY;

	return {
		plugins: [
			devtoolsJson(),
			lucidePreprocess(),
			sveltekit(),
			tailwindcss(),
			POSTHOG_ENV_ID && POSTHOG_SOURCEMAP_API_KEY
				? posthog({
						personalApiKey: POSTHOG_SOURCEMAP_API_KEY,
						envId: POSTHOG_ENV_ID,
						host: "https://eu.i.posthog.com"
					})
				: undefined
		],
		ssr: {
			external: ["@resvg/resvg-js"]
		},
		optimizeDeps: {
			exclude: ["@resvg/resvg-js"]
		},
		build: {
			rollupOptions: {
				external: ["@resvg/resvg-js"]
			}
		}
	};
});
