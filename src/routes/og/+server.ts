import { render } from "svelte/server";
import { dev } from "$app/environment";
import { read } from "$app/server";
import DMSerifDisplay from "@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff";
import Pretendard from "@fontsource/pretendard/files/pretendard-latin-400-normal.woff";
import PretendardSemibold from "@fontsource/pretendard/files/pretendard-latin-600-normal.woff";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { html } from "satori-html";
import Thumbnail from "./Thumbnail.svelte";
import { OG_HEIGHT, OG_WIDTH } from "./constants";

const sansFont = read(Pretendard).arrayBuffer();
const sansFontSemibold = read(PretendardSemibold).arrayBuffer();
const displayFont = read(DMSerifDisplay).arrayBuffer();

/*
 * Sources:
 * - https://github.com/huggingface/chat-ui/blob/ebeff50ac0ac4367a8e1a32b46dcc5ac2e8fc43f/src/routes/assistant/%5BassistantId%5D/thumbnail.png/%2Bserver.ts#L44-L82
 * - https://geoffrich.net/posts/svelte-social-image/
 * - https://github.com/sveltejs/svelte.dev/blob/497b6d5b2c67373a68833a22184cf409004e630d/apps/svelte.dev/src/routes/docs/%5Btopic%5D/%5B...path%5D/card.png/%2Bserver.ts
 */
export async function GET({ url }) {
	const renderedComponent = render(Thumbnail, {
		props: {
			title: url.searchParams.get("title") ?? "",
			description: url.searchParams.get("description") ?? undefined
		}
	});

	const reactLike = html(`<style>${renderedComponent.head}</style>${renderedComponent.body}`);

	const svg = await satori(decodeVNode(reactLike), {
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

	const response = new Response(new Uint8Array(png), {
		headers: {
			"Content-Type": "image/png"
		}
	});
	if (!dev) response.headers.append("Cache-Control", `max-age=${60 * 60 * 24 * 30}, immutable`);
	return response;
}

type VNode = ReturnType<typeof html>;

/**
 * Decodes the XML-ified parts of string subnodes
 * to revert to the original content
 *
 * @param node the original node
 * @returns the node with replaced leaves
 */
function decodeVNode(node: VNode): VNode {
	const children = node.props.children;
	if (!children) return node;

	const decodedChildren =
		typeof children === "string"
			? decodeXML(children)
			: Array.isArray(children)
				? children.map(decodeVNode)
				: decodeVNode(children);

	if (decodedChildren === children) return node;

	return {
		...node,
		props: { ...node.props, children: decodedChildren }
	};
}

const XML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'"
};

const XML_ENTITY_REGEX = new RegExp(
	`&(?:${Object.keys(XML_ENTITIES)
		.map(entity => entity.slice(1, entity.length - 1))
		.join("|")});`,
	"g"
);

function decodeXML(original: string) {
	return original.replace(XML_ENTITY_REGEX, match => XML_ENTITIES[match] ?? match);
}
