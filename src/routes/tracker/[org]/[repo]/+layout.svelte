<script lang="ts">
	import { onNavigate } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { Menu } from "@lucide/svelte";
	import { uniqueRepos } from "$lib/repositories";
	import * as Sheet from "$lib/components/ui/sheet";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import RepoSidePanel from "./RepoSidePanel.svelte";

	let { params, children } = $props();

	onNavigate(({ from, to, type }) => {
		if (from?.route.id !== to?.route.id || type === "form") return;
		open = false;
	});

	let open = $state(false);
</script>

{#snippet repoList()}
	<ul class="space-y-1">
		{#each uniqueRepos as repo (repo)}
			{@const active = repo.owner === params.org && repo.name === params.repo}
			<li>
				{#if active}
					<span class="font-bold underline underline-offset-2">{repo.owner}/<wbr />{repo.name}</span
					>
					<!-- ↖ sorry for that hideous formatting, can't help it, prettier got me -->
				{:else}
					<a
						href={resolve("/tracker/[org]/[repo]", {
							org: repo.owner,
							repo: repo.name
						})}
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
	<div class="min-w-0">
		{@render children()}
	</div>

	<Sheet.Root bind:open>
		<Sheet.Trigger>
			{#snippet child({ props })}
				<AnimatedButton
					{...props}
					variant="secondary"
					class="absolute right-0 mt-12 ml-auto sm:mt-16 lg:hidden"
				>
					<Menu />
					<span class="sr-only">Menu</span>
				</AnimatedButton>
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
