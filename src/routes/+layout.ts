import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import type { MetaTagsProps } from "svelte-meta-tags";

injectSpeedInsights();

const siteName = "Svelte Changelog";

export function load({ url, data }) {
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
