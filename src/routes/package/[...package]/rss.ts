import { error, type RequestHandler } from "@sveltejs/kit";
import { Feed } from "feed";
import { discoverer } from "$lib/server/package-discoverer";
import { getAllPackagesReleases, getPackageReleases } from "../releases";

function getBaseFeed(url: URL, title: string, mode: "all" | "single" = "single") {
	const feed = new Feed({
		copyright: "",
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
				content: release.body ?? undefined,
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
