import type { MetaTagsProps } from "svelte-meta-tags";

export function load() {
	return {
		pageMetaTags: Object.freeze({
			title: "v2 • Blog"
		}) satisfies MetaTagsProps
	};
}
