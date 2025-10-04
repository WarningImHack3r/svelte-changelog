<script lang="ts">
	type Props = {
		title: string;
		description?: string;
	};

	let { title, description = undefined }: Props = $props();
</script>

<div class="my-auto flex h-full w-full flex-col justify-center p-4">
	<p class="font-display text-7xl">{title}</p>
	{#if description}
		<p class="text-4xl text-muted-foreground">{description}</p>
	{/if}
</div>
