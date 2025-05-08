<script lang="ts">
	/**
	 * Markdown block using Marked.js under the hood, with custom renderers
	 * for a cleaner look and using GitHub Flavored Markdown as an option
	 *
	 * @component
	 */
	import type { ComponentProps } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import Markdown, { type Plugin } from "svelte-exmarkdown";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import rehypeRaw from "rehype-raw";
	import posthog from "posthog-js";
	import { cn } from "$lib/utils";
	import { Button } from "$lib/components/ui/button";

	type MdSnippets = Omit<ComponentProps<typeof Markdown>, "md" | "plugins">;

	type Props = {
		markdown: string;
		inline?: boolean;
		parseRawHtml?: boolean;
		additionalPlugins?: Plugin[];
		class?: ClassValue;
	} & MdSnippets;

	let {
		markdown: md,
		inline = false,
		parseRawHtml = false,
		additionalPlugins = [],
		class: className = undefined,
		...snippets
	}: Props = $props();
</script>

<!-- TODO: actually figure out how to overflow-x-auto the code blocks -->
<svelte:element
	this={inline ? "span" : "div"}
	class={cn(
		"prose dark:prose-invert prose-a:wrap-anywhere prose-a:text-primary prose-a:no-underline prose-a:underline-offset-4 prose-a:hover:underline prose-code:wrap-anywhere prose-li:my-1",
		"prose-pre:text-wrap", // remove with TODO
		inline && "*:inline",
		className
	)}
>
	<svelte:boundary onerror={e => posthog.captureException(e, { caughtInBoundary: true })}>
		{#snippet failed(error, reset)}
			{@const message = (() => {
				if (error instanceof Error) return error.message.trim();
				return `${error}`;
			})()}
			{#if !inline}
				<div
					class="flex flex-col rounded-xl border-[0.5px] border-primary bg-red-500/25 px-5 pt-3 pb-4"
				>
					<span>An error occurred while rendering this Markdown content:</span>
					<pre
						class="mt-2 mb-4 rounded-lg bg-neutral-800 px-3 py-2 whitespace-pre-line outline outline-neutral-600">
						{message}
					</pre>
					<span>
						It's now rendered with a minimal look to avoid further errors. Please <a
							href="https://github.com/WarningImHack3r/svelte-changelog/issues"
							target="_blank"
						>
							report this issue
						</a> if it's not already known.
					</span>
					<Button variant="outline" class="ml-auto border-primary/50 bg-red-300/30" onclick={reset}>
						Retry
					</Button>
				</div>
			{/if}
			<Markdown {md} {...snippets} />
		{/snippet}

		<Markdown
			{md}
			plugins={[
				gfmPlugin(),
				...(parseRawHtml ? [{ rehypePlugin: rehypeRaw }] : []),
				...additionalPlugins
			]}
			{...snippets}
		/>
	</svelte:boundary>
</svelte:element>
