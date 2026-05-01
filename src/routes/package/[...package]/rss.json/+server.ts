import { text } from "@sveltejs/kit";
import { rssHandler } from "../rss";

export const GET = rssHandler(feed =>
	text(feed.json1(), {
		headers: {
			"Cache-Control": "max-age=0, s-max-age=600",
			"Content-Type": "application/json"
		}
	})
);
