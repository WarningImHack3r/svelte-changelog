<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import type { Icon } from "@lucide/svelte";
	import { cn } from "$lib/utils";

	type Props = {
		class?: ClassValue;
		icon?: typeof Icon;
		children?: Snippet;
	};

	let { class: className = undefined, icon, children }: Props = $props();
</script>

<div class={cn("step relative", className)}>
	<span
		class="absolute -mt-0.5 -ml-[50px] inline-flex size-9 items-center justify-center rounded-full border-4 border-background bg-muted text-center -indent-0.25 font-mono text-base font-normal"
	>
		{#if icon}
			{@const Component = icon}
			<Component class="size-4" />
		{:else}
			<span class="[counter-increment:step] before:content-[counter(step)]"></span>
		{/if}
	</span>
	{@render children?.()}
</div>
