<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import * as Card from "$lib/components/ui/card";

	type Props = {
		title?: string;
		headless?: boolean;
		class?: ClassValue;
		children?: Snippet;
	};
	let { title = "", headless = false, class: className, children }: Props = $props();
</script>

<Card.Root
	class={[
		{
			"z-10 rounded-md border border-muted-foreground/25 bg-secondary shadow-lg dark:shadow-black":
				!headless,
			"border-0 bg-inherit px-5 py-0 shadow-none": headless
		},
		className
	]}
>
	{#if !headless}
		<Card.Header>
			<Card.Title class="font-display">{title}</Card.Title>
		</Card.Header>
	{/if}
	<Card.Content class={{ "p-0": headless }}>
		{@render children?.()}
	</Card.Content>
</Card.Root>
