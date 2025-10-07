import { render } from "svelte/server";
import { read } from "$app/server";
import DMSerifDisplay from "@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff";
import Pretendard from "@fontsource/pretendard/files/pretendard-latin-400-normal.woff";
import PretendardSemibold from "@fontsource/pretendard/files/pretendard-latin-600-normal.woff";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { html } from "satori-html";
import type { RequestHandler } from "./$types";
import Thumbnail from "./Thumbnail.svelte";
import { OG_HEIGHT, OG_WIDTH } from "./constants";

const sansFont = read(Pretendard).arrayBuffer();
const sansFontSemibold = read(PretendardSemibold).arrayBuffer();
const displayFont = read(DMSerifDisplay).arrayBuffer();

// Sources: https://github.com/huggingface/chat-ui/blob/ebeff50ac0ac4367a8e1a32b46dcc5ac2e8fc43f/src/routes/assistant/%5BassistantId%5D/thumbnail.png/%2Bserver.ts#L44-L82
// https://geoffrich.net/posts/svelte-social-image/
export const GET: RequestHandler = async ({ url }) => {
	const renderedComponent = render(Thumbnail, {
		props: {
			title: url.searchParams.get("title") ?? "",
			description: url.searchParams.get("description") ?? undefined
		}
	});

	const reactLike = html(`<style>${renderedComponent.head}</style>${renderedComponent.body}`);

	const svg = await satori(reactLike, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts: [
			{
				name: "SansFont",
				data: await sansFont,
				weight: 400,
				style: "normal"
			},
			{
				name: "SansFontSemibold",
				data: await sansFontSemibold,
				weight: 600,
				style: "normal"
			},
			{
				name: "DisplayFont",
				data: await displayFont,
				weight: 400,
				style: "normal"
			}
		]
	});

	const png = new Resvg(svg, {
		fitTo: {
			mode: "original"
		}
	})
		.render()
		.asPng();

	// `png` is not usable directly inside `new Response()` for some reason, TS says
	let bodyData;
	if (png instanceof ArrayBuffer) {
		bodyData = png;
	} else if (png.buffer instanceof ArrayBuffer) {
		bodyData = png.buffer;
	} else {
		bodyData = new Uint8Array(png);
	}

 return new Response(bodyData, {
   headers: {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=31536000, immutable"
   }
 });
};
