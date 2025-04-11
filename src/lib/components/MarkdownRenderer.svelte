<script lang="ts">
	/**
	 * Markdown block using Marked.js under the hood, with custom renderers
	 * for a cleaner look and using GitHub Flavored Markdown as an option
	 *
	 * @component
	 */
	import type { ClassValue } from "svelte/elements";
	import Markdown, { type Plugin } from "svelte-exmarkdown";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import rehypeRaw from "rehype-raw";
	import { cn } from "$lib/utils";

	type Props = {
		markdown: string;
		inline?: boolean;
		parseRawHtml?: boolean;
		additionalPlugins?: Plugin[];
		class?: ClassValue;
	};

	let {
		markdown: md,
		inline = false,
		parseRawHtml = false,
		additionalPlugins = [],
		class: className = undefined
	}: Props = $props();
</script>

<!-- TODO: actually figure out how to overflow-x-auto the code blocks -->
<svelte:element
	this={inline ? "span" : "div"}
	class={cn(
		"prose dark:prose-invert prose-a:[overflow-wrap:_anywhere] prose-a:text-primary prose-a:no-underline prose-a:underline-offset-4 prose-a:hover:underline prose-code:[overflow-wrap:_anywhere] prose-li:my-1",
		"prose-pre:text-wrap", // remove with TODO
		inline && "*:inline",
		className
	)}
>
	<Markdown
		{md}
		plugins={[
			gfmPlugin(),
			...(parseRawHtml ? [{ rehypePlugin: rehypeRaw }] : []),
			...additionalPlugins
		]}
	/>
</svelte:element>
