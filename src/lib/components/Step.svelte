<script lang="ts">
	import { cn } from "$lib/utils";

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<div class={cn("step relative", className)}>
	<span
		class="absolute -ml-[50px] -mt-0.5 inline-flex size-9 items-center justify-center rounded-full border-4 border-background bg-muted text-center -indent-[1px] font-mono text-base font-normal"
	>
		{#if $$slots.stepIcon}
			<slot name="stepIcon" />
		{:else}
			<span class="[counter-increment:step] before:content-[counter(step)]"></span>
		{/if}
	</span>
	<slot />
</div>
