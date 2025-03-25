<script lang="ts">
	import { navigating } from "$app/state";
	import { LoaderCircle } from "@lucide/svelte";
	import ReleaseCard from "./ReleaseCard.svelte";
	import SidePanel from "./SidePanel.svelte";
	import * as Accordion from "$lib/components/ui/accordion";

	let { data } = $props();
</script>

{#if navigating.to}
	<span class="inline-flex items-center justify-center">
		<LoaderCircle class="mr-2 size-4 animate-spin" />
		Loading...
	</span>
{:else}
	<div class="my-8 *:last:mt-4">
		<h1 class="text-5xl font-semibold text-primary">{data.currentPackage.packageName}</h1>
		<h2 class="text-xl text-muted-foreground">
			{data.currentPackage.owner}/{data.currentPackage.repoName}
		</h2>
		<h3 class="italic">*insert description*</h3>
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
					packageName={data.currentPackage.packageName}
					repo={{ owner: data.currentPackage.owner, name: data.currentPackage.repoName }}
					{release}
				/>
			{/each}
		</Accordion.Root>
		<SidePanel
			packageName={data.currentPackage.packageName}
			allPackages={data.displayablePackages}
			class="h-fit w-2/5"
		/>
	</div>
{/if}
