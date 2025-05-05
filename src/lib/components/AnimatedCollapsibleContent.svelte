<!--
@component

Based on https://bits-ui.com/docs/components/collapsible#best-practices
-->
<script lang="ts">
	import { Collapsible, type WithoutChildrenOrChild } from "bits-ui";
	import { slide, type SlideParams } from "svelte/transition";
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		duration = 200,
		axis = undefined,
		children,
		...restProps
	}: WithoutChildrenOrChild<Collapsible.ContentProps> & {
		duration?: number;
		axis?: SlideParams["axis"];
		children?: Snippet;
	} = $props();
</script>

<Collapsible.Content forceMount bind:ref {...restProps}>
	{#snippet child({ props, open })}
		{#if open}
			<div {...props} transition:slide={{ duration, axis }} class={[axis === "x" && "flex"]}>
				{@render children?.()}
			</div>
		{/if}
	{/snippet}
</Collapsible.Content>
