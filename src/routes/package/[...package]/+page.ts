import type { MetaTagsProps } from "svelte-meta-tags";

export function load({ data, url }) {
	return {
		...data,
		pageMetaTags: Object.freeze({
			title: data.currentPackage.pkg.name,
			openGraph: {
				images: [
					{
						get url() {
							const ogUrl = new URL("og", url.origin);
							ogUrl.searchParams.set("title", data.currentPackage.pkg.name);
							ogUrl.searchParams.set(
								"description",
								`${data.currentPackage.repoOwner}/${data.currentPackage.repoName}`
							);
							return ogUrl.href;
						}
					}
				]
			}
		}) satisfies MetaTagsProps
	};
}
