import { type RequestHandler, error } from "@sveltejs/kit";
import { Feed } from "feed";
import { marked } from "marked";
import { discoverer } from "$lib/server/package-discoverer";
import { getAllPackagesReleases, getPackageReleases } from "../releases";

/**
 * Get the base info to build an RSS feed upon
 * @param url the page URL; must be an RSS feed
 * @param title the feed title
 * @param mode whether it is a feed for a single or all the packages
 * @return a new {@link Feed} object
 */
function getBaseFeed(url: URL, title: string, mode: "all" | "single" = "single") {
	const feed = new Feed({
		copyright: "Antoine Lethimonnier & GitHub Inc.",
		description: `The releases feed for ${mode === "single" ? title : "all the packages"}, brought by Svelte Changelog.`,
		favicon: "https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg",
		feedLinks: {
			xml: url.toString().replace(/[A-z\d]+\.[A-z\d]+$/, "rss.xml"),
			json: url.toString().replace(/[A-z\d]+\.[A-z\d]+$/, "rss.json"),
			atom: url.toString().replace(/[A-z\d]+\.[A-z\d]+$/, "atom.xml")
		},
		id: url.toString(),
		language: "en",
		link: url.toString(),
		title
	});
	feed.addCategory("Technology");
	feed.addContributor({
		name: "Antoine Lethimonnier",
		link: "https://github.com/WarningImHack3r"
	});
	return feed;
}

/**
 * Convert a raw Markdown into a basic HTML structure
 * @param md the Markdown text
 * @return the HTML conversion
 */
function mdToHtml(md: string | null | undefined) {
	if (!md) return undefined;
	// we'll assume GH content doesn't need to be sanitized *wink wink*
	return marked(md) as string; // can only be a Promise if the `async` option is set to true, not the case here
}

/**
 * A SvelteKit request handler utility to create an RSS feed for packages
 * @param response the handler converting the final feed object into a response
 * @return the response gotten from the callback parameter
 */
export function rssHandler(response: (feed: Feed) => Response): RequestHandler {
	return async ({ params, url, locals }) => {
		const { package: slugPackage } = params;
		if (!slugPackage) error(400);

		// 1. Get all the discovered packages
		const categorizedPackages = await discoverer.getOrDiscoverCategorized();

		// 2. Get the releases and package info
		let packageName: string;
		let releases: NonNullable<Awaited<ReturnType<typeof getPackageReleases>>>["releases"];
		if (slugPackage.toLowerCase() === "all") {
			// All releases
			packageName = "All";
			releases = await getAllPackagesReleases(categorizedPackages, locals.posthog);
		} else {
			// This package releases
			const packageReleases = await getPackageReleases(
				slugPackage,
				categorizedPackages,
				locals.posthog
			);
			if (!packageReleases) error(404);
			packageName = packageReleases.releasesRepo.pkg.name;
			releases = packageReleases.releases;
		}

		const feed = getBaseFeed(
			url,
			`${packageName} releases`,
			packageName.toLowerCase() === "all" ? "all" : "single"
		);
		for (const release of releases) {
			feed.addItem({
				author: [
					{
						name: release.author.name ?? release.author.login ?? undefined,
						link: release.author.html_url,
						email: release.author.email ?? undefined
					}
				],
				content: release.body_html ?? mdToHtml(release.body),
				date: new Date(release.published_at ?? release.created_at),
				description: `${release.cleanName} ${release.cleanVersion} release`,
				id: release.id.toString(),
				link: release.html_url,
				published: release.published_at ? new Date(release.published_at) : undefined,
				title: `${release.cleanName}@${release.cleanVersion}`
			});
		}

		return response(feed);
	};
}
