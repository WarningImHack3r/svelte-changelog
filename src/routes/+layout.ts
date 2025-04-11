import { browser } from "$app/environment";
import { PUBLIC_POSTHOG_TOKEN } from "$env/static/public";
import posthog from "posthog-js";
import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import type { MetaTagsProps } from "svelte-meta-tags";

injectSpeedInsights();

const siteName = "Svelte Changelog";

export function load({ url, data }) {
	if (browser) {
		posthog.init(PUBLIC_POSTHOG_TOKEN, {
			api_host: `${url.origin}/ingest`,
			ui_host: "https://eu.posthog.com",
			person_profiles: "always"
		});
	}

	return {
		...data,
		siteName,
		baseMetaTags: Object.freeze({
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
				cardType: "summary" as const,
				description: "A nice UI to stay up-to-date with Svelte releases"
			},
			keywords: ["svelte", "changelog", "svelte changelog", "sveltekit"],
			additionalRobotsProps: {
				noarchive: true
			}
		}) satisfies MetaTagsProps
	};
}
