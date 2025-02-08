<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils";

	type Props = {
		class?: string | undefined | null;
		stepIcon?: Snippet;
		children?: Snippet;
	};

	let { class: className = undefined, stepIcon, children }: Props = $props();
</script>

<div class={cn("step relative", className)}>
	<span
		class="absolute -mt-0.5 -ml-[50px] inline-flex size-9 items-center justify-center rounded-full border-4 border-background bg-muted text-center -indent-[1px] font-mono text-base font-normal"
	>
		{#if stepIcon}
			{@render stepIcon?.()}
		{:else}
			<span class="[counter-increment:step] before:content-[counter(step)]"></span>
		{/if}
	</span>
	{@render children?.()}
</div>
