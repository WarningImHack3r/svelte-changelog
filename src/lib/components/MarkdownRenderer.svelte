<script lang="ts">
	/**
	 * Markdown block using Marked.js under the hood, with custom renderers
	 * for a cleaner look and using GitHub Flavored Markdown as an option
	 *
	 * @component
	 */
	import type { ComponentProps } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import posthog from "posthog-js";
	import rehypeRaw from "rehype-raw";
	import Markdown, { type Plugin } from "svelte-exmarkdown";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import { cn } from "$lib/utils";
	import AnimatedButton from "./AnimatedButton.svelte";

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

<svelte:element
	this={inline ? "span" : "div"}
	class={cn(
		"prose dark:prose-invert prose-a:wrap-anywhere prose-a:text-primary prose-a:no-underline prose-a:underline-offset-4 prose-a:hover:underline prose-code:wrap-anywhere prose-li:my-1",
		"prose-pre:text-wrap",
		inline && "*:inline",
		className
	)}
>
	<svelte:boundary
		onerror={e =>
			posthog.captureException(e, {
				caughtInBoundary: true,
				boundaryLocation: "MarkdownRenderer",
				md
			})}
	>
		{#snippet failed(error, reset)}
			{#if inline}
				<Markdown md="[Rendering error] {md}" {...snippets} />
			{:else}
				{@const message =
					error instanceof Error
						? `${error.name}: ${error.message}`.trim()
						: typeof error === "object" && error !== null
							? JSON.stringify(error).trim()
							: `${error}`}
				<div
					class="flex flex-col rounded-xl border-[0.5px] border-primary bg-red-500/25 px-5 pt-3 pb-4"
				>
					<span>An error occurred while rendering this Markdown content:</span>
					<pre
						class="mt-2 mb-4 rounded-lg bg-neutral-800 px-3 py-2 whitespace-pre-line outline outline-neutral-600">{message}</pre>
					<span>
						It's now rendered with a minimal look to avoid further errors. Please <a
							href="https://github.com/WarningImHack3r/svelte-changelog/issues"
							target="_blank"
						>
							report this issue
						</a> if it's not already known.
					</span>
					<AnimatedButton
						variant="outline"
						class="ml-auto border-primary/50 bg-red-300/30"
						onclick={reset}
					>
						Retry
					</AnimatedButton>
				</div>
				<Markdown {md} {...snippets} />
			{/if}
		{/snippet}

		<Markdown
			{md}
			plugins={[
				gfmPlugin(),
				{ rehypePlugin: parseRawHtml ? [rehypeRaw, { tagfilter: true }] : undefined },
				...additionalPlugins
			]}
			{...snippets}
		>
			{#snippet a({ children, ...rest })}
				<!-- Markdown renders <thing:*> as a link (yeah I didn't know either). -->
				<!-- We don't want that to break Svelte's special elements, so we escape them. -->
				<!---->
				<!-- Refs: -->
				<!-- - https://www.markdownguide.org/basic-syntax/#urls-and-email-addresses -->
				<!-- - https://svelte.dev/docs/svelte/svelte-boundary (and others) -->
				{#if /svelte:\S+/.test(rest.href ?? "")}
					&lt;{@render children?.()}&gt;
				{:else if snippets.a}
					{@render snippets.a({ children, ...rest })}
				{:else}
					<a {...rest}>{@render children?.()}</a>
				{/if}
			{/snippet}
		</Markdown>
	</svelte:boundary>
</svelte:element>

<style>
	.prose :global(ul.contains-task-list > li.task-list-item) {
		list-style-type: none;
		margin-inline-start: -1.5rem; /* about what the ul indents */
	}
</style>
