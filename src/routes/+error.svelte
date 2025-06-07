<script lang="ts">
	import { page } from "$app/state";
</script>

<svelte:head>
	<title>Error {page.status} | Svelte Changelog</title>
</svelte:head>

<div class="w-full h-[75vh] flex flex-col justify-center items-center">
	<h1 class="text-[15rem] leading-none">{page.status}</h1>
	{#if page.error}
		<h3 class="font-semibold text-muted-foreground text-2xl">{page.error.message}</h3>
	{/if}
</div>
