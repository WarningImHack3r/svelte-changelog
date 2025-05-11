import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data }) {
	return {
		...data,
		pageMetaTags: Object.freeze({
			title: `Detail of ${data.itemMetadata.org}/${data.itemMetadata.repo}#${data.itemMetadata.id}`
		}) satisfies MetaTagsProps
	};
}
