import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data, url }) {
	return {
		...data,
		pageMetaTags: Object.freeze<MetaTagsProps>({
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
		})
	};
}
