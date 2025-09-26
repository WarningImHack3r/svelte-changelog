import type { MetaTagsProps } from "svelte-meta-tags";
import { OG_HEIGHT, OG_WIDTH } from "./constants";

export function load({ url }) {
	const title = "OG Image Playground";
	const description = "Experiment generated OG images";

	return {
		pageMetaTags: Object.freeze({
			title,
			description,
			openGraph: {
				images: [
					{
						get url() {
							const u = new URL(url.pathname, url.origin);
							u.searchParams.append("title", title);
							u.searchParams.append("description", description);
							return u.href;
						},
						width: OG_WIDTH,
						height: OG_HEIGHT
					}
				]
			}
		}) satisfies MetaTagsProps
	};
}
