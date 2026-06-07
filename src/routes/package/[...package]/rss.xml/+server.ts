import { rssHandler } from "../rss";

export const GET = rssHandler(
	feed =>
		new Response(feed.rss2(), {
			headers: {
				"Cache-Control": "max-age=0, s-max-age=600",
				"Content-Type": "application/xml"
			}
		})
);
