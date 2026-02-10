import { definePageMetaTags } from "svelte-meta-tags";
import { siteName } from "$lib/properties";

export function load({ url }) {
	return definePageMetaTags({
		title: "v2 • Devlog",
		description: `The development blog of ${siteName}`,
		openGraph: {
			images: [
				{
					get url() {
						const ogUrl = new URL("og", url.origin);
						ogUrl.searchParams.set("title", "v2 • Devlog");
						return ogUrl.href;
					}
				}
			]
		},
		twitter: {
			cardType: "summary_large_image"
		}
	});
}
