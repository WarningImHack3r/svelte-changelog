import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data }) {
	return {
		...data,
		pageMetaTags: Object.freeze({
			title: data.currentPackage.pkg.name
		}) satisfies MetaTagsProps
	};
}
