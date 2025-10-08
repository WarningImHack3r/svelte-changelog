import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data, url }) {
	return {
		...data,
		pageMetaTags: Object.freeze<MetaTagsProps>({
			title: `Detail of ${data.itemMetadata.org}/${data.itemMetadata.repo}#${data.itemMetadata.id}`,
			openGraph: {
				images: [
					{
						get url() {
							const ogUrl = new URL("og", url.origin);
							ogUrl.searchParams.set("title", data.item.info.title);
							ogUrl.searchParams.set(
								"description",
								`${data.itemMetadata.org}/${data.itemMetadata.repo}#${data.itemMetadata.id}`
							);
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
