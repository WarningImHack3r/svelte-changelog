<script lang="ts">
	type Props = {
		title: string;
		description?: string;
	};

	let { title, description = undefined }: Props = $props();
</script>

<div class="size-full">
	<p class="font-display">{title}</p>
	<p class="text-muted-foreground">{description}</p>
</div>
