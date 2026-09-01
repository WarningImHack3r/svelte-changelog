import { definePageMetaTags } from "svelte-meta-tags";
import { getRouteReleases } from "./releases.remote";

export async function load({ url, params: { package: slugPackage } }) {
	const { currentPackage } = await getRouteReleases(slugPackage);
	return definePageMetaTags({
		title: currentPackage.pkg.name,
		openGraph: {
			images: [
				{
					get url() {
						/*
						 * theorically, npm packages can't have a slash; the only possible
						 * slash comes from the @scope.
						 * but let's be extra careful just for fun.
						 */
						const [first, ...rest] = currentPackage.pkg.name.split("/");
						const ogUrl = new URL("og", url.origin);
						if (first && rest.length) ogUrl.searchParams.set("eyebrow", first);
						ogUrl.searchParams.set("title", rest.join("/") || currentPackage.pkg.name);
						ogUrl.searchParams.set(
							"description",
							`${currentPackage.repoOwner}/${currentPackage.repoName}`
						);
						return ogUrl.href;
					}
				}
			]
		},
		twitter: {
			cardType: "summary_large_image"
		}
	});
}
