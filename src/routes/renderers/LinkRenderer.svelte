<script lang="ts">
	import { cn } from "$lib/utils";
	import { buttonVariants } from "$lib/components/ui/button";

	/**
	 * The raw markdown string.
	 */
	export let raw: string;
	/**
	 * The link.
	 */
	export let href: string;
	/**
	 * The element's title attribute.
	 */
	export let title: string | null;
	/**
	 * The link's text.
	 */
	export let text: string;
</script>

<a
	{href}
	target="_blank"
	class={cn(
		buttonVariants({
			variant: "link"
		}),
		"h-auto p-0"
	)}
>
	{#if text.startsWith("`") && text.endsWith("`")}
		<code class="relative rounded bg-muted px-[0.3rem] py-[0.1rem] font-mono text-xs font-semibold">
			{text.replaceAll("`", "")}
		</code>
	{:else}
		<slot />
	{/if}
</a>
