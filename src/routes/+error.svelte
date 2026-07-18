<script lang="ts">
	import { siteName } from "$lib/properties";
	import { Button } from "$lib/components/ui/button";
	import type { ErrorProps } from "./$types";

	let { error }: ErrorProps = $props();
</script>

<svelte:head>
	<title>Error {error.status} | {siteName}</title>
</svelte:head>

<div
	class={[
		"flex h-[75vh] w-full flex-col justify-center",
		error?.description ? "items-start gap-2" : "items-center"
	]}
>
	{#if error?.description}
		<div class="relative w-full">
			<h1 class="text-5xl leading-none">{error.message}</h1>
			<h3 class="max-w-prose text-xl font-semibold text-muted-foreground">
				{error.description}
			</h3>
			<span
				class="absolute inset-y-0 right-0 -translate-y-4 font-display text-9xl text-muted-foreground opacity-20"
			>
				{error.status}
			</span>
		</div>
	{:else}
		<h1 class="text-[15rem] leading-none">{error.status}</h1>
		{#if error}
			<h3 class="text-2xl font-semibold text-muted-foreground">{error.message}</h3>
		{/if}
	{/if}
	{#if error?.link}
		<Button href={error.link.href} class="mt-8">{error.link.text}</Button>
	{/if}
</div>
