import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import { getRepositories } from "$lib/repositories";

injectSpeedInsights();

export function load() {
	return { repos: getRepositories() };
}
