<script lang="ts">
	import { page } from "$app/state";
	import { Menu } from "@lucide/svelte";
	import { uniqueRepos } from "$lib/repositories";
	import { Button } from "$lib/components/ui/button";
	import * as Sheet from "$lib/components/ui/sheet";
	import RepoSidePanel from "./RepoSidePanel.svelte";

	let { children } = $props();
</script>

{#snippet repoList()}
	<ul class="space-y-1">
		{#each uniqueRepos as repo (repo)}
			{@const active = repo.owner === page.params.org && repo.name === page.params.repo}
			<li>
				{#if active}
					<span class="font-bold underline underline-offset-2">{repo.owner}/<wbr />{repo.name}</span
					>
				{:else}
					<a
						href="../{repo.owner}/{repo.name}"
						class="hover:underline hover:text-primary underline-offset-2"
					>
						{repo.owner}/<wbr />{repo.name}
					</a>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="relative flex gap-8">
	<div class="min-w-0">
		{@render children()}
	</div>

	<Sheet.Root>
		<Sheet.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="secondary"
					class="absolute right-0 mt-12 ml-auto lg:hidden sm:mt-16"
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
		class="mt-43 ml-auto shrink-0 hidden h-fit w-80 lg:flex flex-col"
	>
		{@render repoList()}
	</RepoSidePanel>
</div>
