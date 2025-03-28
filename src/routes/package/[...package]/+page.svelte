<script lang="ts">
	import { navigating } from "$app/state";
	import { LoaderCircle } from "@lucide/svelte";
	import ReleaseCard from "./ReleaseCard.svelte";
	import SidePanel from "./SidePanel.svelte";
	import * as Accordion from "$lib/components/ui/accordion";

	let { data } = $props();
</script>

{#snippet loading()}
	<span class="inline-flex items-center justify-center">
		<LoaderCircle class="mr-2 size-4 animate-spin" />
		Loading...
	</span>
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
				class="h-fit w-2/5"
			/>
		</div>
	{/await}
{/if}
