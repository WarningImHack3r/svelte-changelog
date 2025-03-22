import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import { repos } from "$lib/repositories";

injectSpeedInsights();

export function load() {
	return { repos };
}
