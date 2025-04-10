import type { MetaTagsProps } from "svelte-meta-tags";

export function load() {
	return {
		pageMetaTags: Object.freeze({
			title: "All Packages"
		}) satisfies MetaTagsProps
	};
}
