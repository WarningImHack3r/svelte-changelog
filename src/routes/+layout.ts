import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import { repositories } from "$lib/repositories";

injectSpeedInsights();

export function load() {
	return { repos: repositories };
}
