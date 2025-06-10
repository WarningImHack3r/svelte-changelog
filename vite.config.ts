import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig({
	plugins: [devtoolsJson(), lucidePreprocess(), sveltekit(), tailwindcss()]
});
