<script lang="ts">
	import Thumbnail from "./Thumbnail.svelte";
	import { OG_HEIGHT, OG_WIDTH } from "./constants";

	let title: string;
	let description: string;
</script>

<div class="mb-8">
	<h1 class="text-4xl">OG Image Playground</h1>
	<h2 class="max-w-1/2 text-xl text-balance text-muted-foreground">
		This tool is made for internal usage, though you can play with it as you wish
	</h2>
</div>

<div
	class="mx-auto mb-8 h-(--og-height) w-(--og-width) border-4"
	style:--og-width="{OG_WIDTH}px"
	style:--og-height="{OG_HEIGHT}px"
>
	<Thumbnail {title} {description} />
</div>

Title:<input bind:value={title} name="title" class="border" />
Description: <input bind:value={description} name="description" class="border" />
