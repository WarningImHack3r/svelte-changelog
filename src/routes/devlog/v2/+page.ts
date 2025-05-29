import type { MetaTagsProps } from "svelte-meta-tags";

export function load() {
	return {
		pageMetaTags: Object.freeze({
			title: "v2 • Devlog",
			description: "The development blog of Svelte Changelog",
			twitter: {
				description: "The development blog of Svelte Changelog"
			}
		}) satisfies MetaTagsProps
	};
}
