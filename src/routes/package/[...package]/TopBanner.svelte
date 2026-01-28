<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import type { Icon } from "@lucide/svelte";
	import * as Alert from "$lib/components/ui/alert";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";

	type Props = {
		icon?: typeof Icon;
		title: string;
		markdown: string;
		class?: ClassValue;
		additionalContent?: Snippet;
	};

	let { icon: BannerIcon, title, markdown, class: className, additionalContent }: Props = $props();
</script>

<Alert.Root class={["rounded-md", className]}>
	{#if BannerIcon}
		<BannerIcon class="size-4" />
	{/if}
	<Alert.Title>{title}</Alert.Title>
	<Alert.Description>
		<MarkdownRenderer
			{markdown}
			inline
			class="max-w-full text-sm text-muted-foreground prose-li:ms-6"
		>
			{#snippet a({ children, ...rest })}
				<a {...rest} target="_blank">
					{@render children?.()}
				</a>
			{/snippet}
		</MarkdownRenderer>
		{@render additionalContent?.()}
	</Alert.Description>
</Alert.Root>
