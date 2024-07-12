<script lang="ts">
	import Markdown from "svelte-exmarkdown";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import { cn } from "$lib/utils";

	export let markdown: string;
	export let inline = false;

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<span
	class={cn(
		"prose dark:prose-invert prose-a:no-underline prose-a:underline-offset-4 prose-a:[overflow-wrap:_anywhere] hover:prose-a:underline prose-li:my-1",
		inline && "*:inline",
		className
	)}
>
	<Markdown md={markdown} plugins={[gfmPlugin()]} />
</span>
