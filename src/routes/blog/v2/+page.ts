import type { MetaTagsProps } from "svelte-meta-tags";

export function load() {
	return {
		pageMetaTags: Object.freeze({
			title: "v2 • Blog",
			description: "The blog of Svelte Changelog",
			twitter: {
				description: "The blog of Svelte Changelog"
			}
		}) satisfies MetaTagsProps
	};
}
