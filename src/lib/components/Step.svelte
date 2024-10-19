<script lang="ts">
	import { cn } from "$lib/utils";

	type Props = {
		class?: string | undefined | null;
		stepIcon?: import("svelte").Snippet;
		children?: import("svelte").Snippet;
	};

	let { class: className = undefined, stepIcon, children }: Props = $props();
</script>

<div class={cn("step relative", className)}>
	<span
		class="absolute -ml-[50px] -mt-0.5 inline-flex size-9 items-center justify-center rounded-full border-4 border-background bg-muted text-center -indent-[1px] font-mono text-base font-normal"
	>
		{#if stepIcon}
			{@render stepIcon?.()}
		{:else}
			<span class="[counter-increment:step] before:content-[counter(step)]"></span>
		{/if}
	</span>
	{@render children?.()}
</div>
