import { definePageMetaTags } from "svelte-meta-tags";
import { pidFormatter } from "$lib/strings";

export function load({ data, url }) {
	const element = pidFormatter.toHumanReadable(data.itemMetadata.type);
	return {
		...data,
		...definePageMetaTags({
			title: `Details of ${element.toLowerCase()} ${data.itemMetadata.org}/${data.itemMetadata.repo}#${data.itemMetadata.id}`,
			openGraph: {
				images: [
					{
						get url() {
							const ogUrl = new URL("og", url.origin);
							ogUrl.searchParams.set("title", data.item.info.title);
							ogUrl.searchParams.set(
								"description",
								`${data.itemMetadata.org}/${data.itemMetadata.repo}#${data.itemMetadata.id} • ${element}`
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
