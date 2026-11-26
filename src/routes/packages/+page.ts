import { definePageMetaTags } from "svelte-meta-tags";

export function load({ url }) {
	return definePageMetaTags({
		title: "All Packages",
		openGraph: {
			images: [
				{
					get url() {
						const ogUrl = new URL("og", url.origin);
						ogUrl.searchParams.set("title", "All Packages");
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
