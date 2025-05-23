import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data }) {
	return {
		...data,
		pageMetaTags: Object.freeze({
			title: "All Packages"
		}) satisfies MetaTagsProps
	};
}
