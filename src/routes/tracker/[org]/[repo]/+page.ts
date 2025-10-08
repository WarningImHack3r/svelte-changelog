import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data, params, url }) {
	return {
		...data,
		pageMetaTags: Object.freeze<MetaTagsProps>({
			title: `Tracker for ${params.org}/${params.repo}`,
			openGraph: {
				images: [
					{
						get url() {
							const ogUrl = new URL("og", url.origin);
							ogUrl.searchParams.set("title", `Tracker • ${params.org}/${params.repo}`);
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
