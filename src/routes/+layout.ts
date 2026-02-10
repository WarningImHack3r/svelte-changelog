import { browser, dev } from "$app/environment";
import { PUBLIC_POSTHOG_KEY } from "$env/static/public";
import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import posthog from "posthog-js";
import { defineBaseMetaTags } from "svelte-meta-tags";
import { siteName } from "$lib/properties";

injectSpeedInsights();

let phInit = false;

export function load({ url, data }) {
	if (!phInit && browser && !dev) {
		posthog.init(PUBLIC_POSTHOG_KEY, {
			api_host: `${url.origin}/ingest`,
			ui_host: "https://eu.posthog.com",
			person_profiles: "always"
		});
		phInit = true;
	}

	return {
		...data,
		siteName,
		...defineBaseMetaTags({
			title: "Loading...",
			titleTemplate: `%s | ${siteName}`,
			description: "A nice UI to stay up-to-date with Svelte releases",
			canonical: new URL(url.pathname, url.origin).href,
			openGraph: {
				type: "website",
				url: new URL(url.pathname, url.origin).href,
				locale: "en_US",
				siteName,
				images: [
					{
						url: "https://svelte.dev/favicon.png",
						width: 128,
						height: 128,
						alt: "Svelte logo"
					}
				]
			},
			twitter: {
				creator: "@probably_coding",
				cardType: "summary",
				description: "A nice UI to stay up-to-date with Svelte releases"
			},
			keywords: ["svelte", "changelog", "svelte changelog", "sveltekit"],
			additionalRobotsProps: {
				noarchive: true
			}
		})
	};
}
