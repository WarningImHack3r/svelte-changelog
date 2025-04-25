<script lang="ts">
	import { page } from "$app/state";
	import { Menu } from "@lucide/svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Sheet from "$lib/components/ui/sheet";
	import SidePanel from "./SidePanel.svelte";

	let { data, children } = $props();

	let showPrereleases = $state(true);
</script>

<div class="relative mt-8 flex gap-8 lg:mt-0">
	<div class="flex-1">
		{@render children()}
	</div>

	<Sheet.Root>
		<Sheet.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="secondary"
					class={[
						"absolute right-0 mt-12 ml-auto lg:hidden",
						page.data.currentPackage.pkg.description?.length && "mt-16"
					]}
				>
					<Menu />
					<span class="sr-only">Menu</span>
				</Button>
			{/snippet}
		</Sheet.Trigger>
		<Sheet.Content class="overflow-y-auto">
			<Sheet.Header>
				<Sheet.Title>Packages</Sheet.Title>
			</Sheet.Header>
			<SidePanel
				headless
				packageName={page.data.currentPackage.pkg.name}
				allPackages={data.displayablePackages}
				otherReleases={data.allReleases}
				bind:showPrereleases
				class="my-8"
			/>
		</Sheet.Content>
	</Sheet.Root>

	<SidePanel
		packageName={page.data.currentPackage.pkg.name}
		allPackages={data.displayablePackages}
		otherReleases={data.allReleases}
		class={[
			"mt-35 hidden h-fit w-100 shrink-0 lg:flex",
			page.data.currentPackage.pkg.description?.length && "mt-45"
		]}
		bind:showPrereleases
	/>
</div>
