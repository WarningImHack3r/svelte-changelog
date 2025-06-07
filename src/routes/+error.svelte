<script lang="ts">
	import { page } from "$app/state";
</script>

<svelte:head>
	<title>Error {page.status} | Svelte Changelog</title>
</svelte:head>

<div class="flex h-[75vh] w-full flex-col items-center justify-center">
	<h1 class="text-[15rem] leading-none">{page.status}</h1>
	{#if page.error}
		<h3 class="text-2xl font-semibold text-muted-foreground">{page.error.message}</h3>
	{/if}
</div>
