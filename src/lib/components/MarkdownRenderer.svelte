<script lang="ts">
	/**
	 * Markdown block using Marked.js under the hood, with custom renderers
	 * for a cleaner look and using GitHub Flavored Markdown as an option
	 *
	 * @component
	 */
	import Markdown, { type Plugin } from "svelte-exmarkdown";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import rehypeRaw from "rehype-raw";
	import { cn } from "$lib/utils";

	export let markdown: string;
	export let inline = false;
	export let parseRawHtml = false;
	export let additionalPlugins: Plugin[] = [];

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<!-- TODO: actually figure out how to overflow-x-auto the code blocks -->
<span
	class={cn(
		"prose dark:prose-invert prose-a:no-underline prose-a:underline-offset-4 prose-a:[overflow-wrap:_anywhere] hover:prose-a:underline prose-code:[overflow-wrap:_anywhere] prose-li:my-1",
		"prose-code:text-wrap", // remove with TODO
		inline && "*:inline",
		className
	)}
>
	<Markdown
		md={markdown}
		plugins={[
			gfmPlugin(),
			...(parseRawHtml ? [{ rehypePlugin: rehypeRaw }] : []),
			...additionalPlugins
		]}
	/>
</span>
