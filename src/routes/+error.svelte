<script lang="ts">
	import { page } from "$app/state";
	import { ArrowUpRight } from "@lucide/svelte";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import { siteName } from "$lib/properties";
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
	{#if page.error?.links}
		<div class="mt-8 flex flex-wrap gap-4">
			{#each page.error.links as { href, text }, i (`${text}|${href}`)}
				{const isExternal = href.startsWith("https://")}
				<AnimatedButton
					{href}
					variant={i > 0 ? "outline" : undefined}
					rel={isExternal ? "external" : undefined}
					target={isExternal ? "_blank" : undefined}
					class={["group", isExternal && "h-auto shrink whitespace-normal"]}
				>
					{text}
					{#if isExternal}
						<ArrowUpRight
							class="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
						/>
					{/if}
				</AnimatedButton>
			{/each}
		</div>
	{/if}
</div>
