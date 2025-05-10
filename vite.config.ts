import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig({
	plugins: [lucidePreprocess(), sveltekit(), tailwindcss()],
	server: {
		strictPort: true // default port required for Login with GH workflow
	}
});
