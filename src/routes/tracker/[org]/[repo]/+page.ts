import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data, params }) {
	return {
		...data,
		pageMetaTags: Object.freeze({
			title: `Tracker for ${params.org}/${params.repo}`
		}) satisfies MetaTagsProps
	};
}
