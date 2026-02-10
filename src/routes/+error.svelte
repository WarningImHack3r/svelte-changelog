<script lang="ts">
	import { page } from "$app/state";
	import { siteName } from "$lib/properties";
	import { Button } from "$lib/components/ui/button";
</script>

<svelte:head>
	<title>Error {page.status} | {siteName}</title>
</svelte:head>

<div
	class={[
		"flex h-[75vh] w-full flex-col justify-center",
		page.error?.description ? "items-start gap-2" : "items-center"
	]}
>
	{#if page.error?.description}
		<div class="relative w-full">
			<h1 class="text-5xl leading-none">{page.error.message}</h1>
			<h3 class="max-w-prose text-xl font-semibold text-muted-foreground">
				{page.error.description}
			</h3>
			<span
				class="absolute inset-y-0 right-0 -translate-y-4 font-display text-9xl text-muted-foreground opacity-20"
			>
				{page.status}
			</span>
		</div>
	{:else}
		<h1 class="text-[15rem] leading-none">{page.status}</h1>
		{#if page.error}
			<h3 class="text-2xl font-semibold text-muted-foreground">{page.error.message}</h3>
		{/if}
	{/if}
	{#if page.error?.link}
		<Button href={page.error.link.href} class="mt-8">{page.error.link.text}</Button>
	{/if}
</div>
