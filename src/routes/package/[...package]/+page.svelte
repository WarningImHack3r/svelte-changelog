<script lang="ts">
	import { navigating } from "$app/state";
	import { LoaderCircle } from "@lucide/svelte";
	import ReleaseCard from "./ReleaseCard.svelte";
	import SidePanel from "./SidePanel.svelte";
	import * as Accordion from "$lib/components/ui/accordion";
	import { Skeleton } from "$lib/components/ui/skeleton";

	let { data } = $props();
</script>

{#snippet loading()}
	<div class="my-8 space-y-2">
		<Skeleton class="h-16 w-64" />
		<Skeleton class="h-8 w-32" />
	</div>
	<div class="flex gap-8">
		<div class="relative w-full space-y-2">
			<p
				class="absolute top-[4.5rem] left-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-xl"
			>
				<LoaderCircle class="mr-2 size-4 animate-spin" />
				Loading...
			</p>
			<Skeleton class="h-36 w-full" />
			<Skeleton class="h-44 w-full" />
			<Skeleton class="h-16 w-full" />
			<Skeleton class="h-80 w-full" />
		</div>
		<Skeleton class="h-96 w-1/3" />
	</div>
{/snippet}

{#if navigating.to}
	{@render loading()}
{:else}
	<!-- Required to avoid a layout shift/hydration mismatch for some reason -->
	{#await Promise.resolve()}
		{@render loading()}
	{:then}
		<div class="my-8">
			<h1 class="text-5xl font-semibold text-primary">{data.currentPackage.pkg.name}</h1>
			<h2 class="text-xl text-muted-foreground">
				{data.currentPackage.owner}/{data.currentPackage.repoName}
			</h2>
			{#if data.currentPackage.pkg.description}
				<h3 class="mt-4 italic">{data.currentPackage.pkg.description}</h3>
			{/if}
		</div>
		<div class="flex gap-8">
			<Accordion.Root
				type="multiple"
				value={data.releases
					// Only expand releases that are less than a week old
					.filter(({ created_at }) => {
						return new Date(created_at).getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
					})
					.map(({ id }) => id.toString())}
				class="w-full"
			>
				{#each data.releases as release (release.id)}
					<ReleaseCard
						packageName={data.currentPackage.pkg.name}
						repo={{ owner: data.currentPackage.owner, name: data.currentPackage.repoName }}
						{release}
					/>
				{/each}
			</Accordion.Root>
			<SidePanel
				packageName={data.currentPackage.pkg.name}
				allPackages={data.displayablePackages}
				class="h-fit w-[35rem]"
			/>
		</div>
	{/await}
{/if}
