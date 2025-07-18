<script lang="ts">
	import { onNavigate } from "$app/navigation";
	import { navigating } from "$app/state";
	import { LoaderCircle, Menu } from "@lucide/svelte";
	import { uniqueRepos } from "$lib/repositories";
	import { Button } from "$lib/components/ui/button";
	import * as Sheet from "$lib/components/ui/sheet";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import RepoSidePanel from "./RepoSidePanel.svelte";

	let { params, children } = $props();

	onNavigate(({ from, to, type }) => {
		if (from?.route.id !== to?.route.id || type === "form") return;
		open = false;
	});

	let open = $state(false);

	/**
	 * The classic function that generates a random integer
	 * between the specified minimum and maximum values, inclusive.
	 *
	 * @param min - The minimum value in the range.
	 * @param max - The maximum value in the range.
	 * @returns A random integer within the range [min, max].
	 */
	function random(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
</script>

{#snippet repoList()}
	<ul class="space-y-1">
		{#each uniqueRepos as repo (repo)}
			{@const active = repo.owner === params.org && repo.name === params.repo}
			<li>
				{#if active}
					<span class="font-bold underline underline-offset-2">{repo.owner}/<wbr />{repo.name}</span
					>
				{:else}
					<a
						href="../{repo.owner}/{repo.name}"
						class="underline-offset-2 hover:text-primary hover:underline"
					>
						{repo.owner}/<wbr />{repo.name}
					</a>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="relative flex gap-8">
	{#if navigating.to}
		<div class="flex w-full flex-col">
			<div class="mt-8 space-y-2">
				<Skeleton class="h-16 w-72" />
				<Skeleton class="h-8 w-56" />
			</div>
			<div class="relative w-full space-y-2">
				<p
					class="absolute top-44 left-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 justify-center text-xl"
				>
					<LoaderCircle class="mr-2 h-lh shrink-0 animate-spin" />
					Gathering all the data, this may take some time...
				</p>
				{#each Array(3), i (i)}
					<Skeleton class="mt-16 mb-4 h-12 w-52" />
					{#each Array(random(1, 6)), j (j)}
						<Skeleton class="h-24 w-full" />
					{/each}
				{/each}
			</div>
		</div>
	{:else}
		<div class="min-w-0">
			{@render children()}
		</div>
	{/if}

	<Sheet.Root bind:open>
		<Sheet.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="secondary"
					class="absolute right-0 mt-12 ml-auto sm:mt-16 lg:hidden"
				>
					<Menu />
					<span class="sr-only">Menu</span>
				</Button>
			{/snippet}
		</Sheet.Trigger>
		<Sheet.Content class="overflow-y-auto">
			<Sheet.Header>
				<Sheet.Title>Repositories</Sheet.Title>
			</Sheet.Header>
			<RepoSidePanel headless title="Repositories">
				{@render repoList()}
			</RepoSidePanel>
		</Sheet.Content>
	</Sheet.Root>

	<RepoSidePanel
		title="Repositories"
		class="mt-43 ml-auto hidden h-fit w-80 shrink-0 flex-col lg:flex"
	>
		{@render repoList()}
	</RepoSidePanel>
</div>
