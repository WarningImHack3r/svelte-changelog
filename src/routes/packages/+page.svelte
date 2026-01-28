<script lang="ts">
	import { resolve } from "$app/paths";
	import { ChevronRight, Pin } from "@lucide/svelte";
	import { PersistedState } from "runed";
	import { getBadgeDataFromRecord, getUnvisitedReleases } from "$lib/badges";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { Toggle } from "$lib/components/ui/toggle";

	let { data } = $props();

	// Pins
	let pinnedPackages = new PersistedState<string[]>("sidebar-pinned", []);
	/**
	 * A set proxy to quickly query the pinned items.
	 * Storing a customly serialized SvelteSet in the PersistedState doesn't work
	 * as it isn't reactive (enough).
	 */
	const pinnedROProxy = $derived(new Set(pinnedPackages.current));
</script>

{#snippet newBadge(count: number)}
	{#if count > 0}
		<Badge>{count} new</Badge>
	{/if}
{/snippet}

<ul class="space-y-8">
	{#each data.displayablePackages as { category, packages } (category)}
		{@const sortedPackages = packages.toSorted(({ pkg: pkgA }, { pkg: pkgB }) => {
			const isAPinned = pinnedROProxy.has(pkgA.name);
			const isBPinned = pinnedROProxy.has(pkgB.name);
			return isAPinned === isBPinned ? 0 : isAPinned ? -1 : 1;
		})}
		<li>
			<h3 class="space-x-2 font-display">
				<span class="text-3xl text-primary text-shadow-sm">{category.name}</span>
				{#if category.description}
					<span>{category.description}</span>
				{/if}
			</h3>
			<ul class="mt-2">
				{#each sortedPackages as { repoOwner, repoName, pkg }, index (pkg.name)}
					{@const viewTransitionName = pkg.name.replace(/[@/-]/g, "")}
					{@const linkedBadgeData = getBadgeDataFromRecord(data.allReleases, pkg.name)}
					{#if index > 0}
						<Separator class="mx-auto my-1 w-[95%]" />
					{/if}
					<li>
						<a
							href={resolve("/package/[...package]", {
								package: pkg.name
							})}
							onclick={e => {
								if (!(e.target instanceof HTMLAnchorElement)) e.preventDefault(); // avoid pinning from navigating
							}}
							class="group flex items-center gap-4 rounded-md px-4 py-3 transition-colors hover:bg-muted"
							title={pkg.deprecated ? `Deprecated: ${pkg.deprecated}` : undefined}
						>
							{#if sortedPackages.length > 1}
								<Toggle
									aria-label={pinnedROProxy.has(pkg.name) ? `Unpin ${pkg.name}` : `Pin ${pkg.name}`}
									pressed={pinnedROProxy.has(pkg.name)}
									class="shrink-0 hover:bg-inherit hover:text-inherit hover:opacity-100! data-[state=off]:opacity-20 data-[state=off]:group-hover:opacity-50 data-[state=on]:*:fill-amber-500 data-[state=on]:*:stroke-amber-500 hover:data-[state=on]:*:fill-amber-500/30"
									onPressedChange={pressed => {
										if (pressed) {
											if (!pinnedROProxy.has(pkg.name)) pinnedPackages.current.push(pkg.name);
										} else {
											pinnedPackages.current = pinnedPackages.current.filter(
												item => item !== pkg.name
											);
										}
									}}
								>
									<Pin />
								</Toggle>
							{/if}
							<div class="flex flex-col">
								<h4
									class="inline-flex flex-col items-start gap-2 font-medium motion-safe:[view-transition-name:var(--vt-name)] xs:flex-row xs:items-center"
									style:--vt-name="title-{viewTransitionName}"
								>
									<span
										class={[
											pkg.deprecated &&
												"opacity-75 transition-opacity duration-300 not-group-hover:line-through group-hover:opacity-100"
										]}
									>
										{pkg.name}
									</span>
									{#if pkg.deprecated}
										<Badge variant="outline" class="mb-2 border-amber-600 text-amber-600 xs:mb-0">
											Deprecated
										</Badge>
									{/if}
								</h4>
								<span class="text-muted-foreground">
									<span
										class="motion-safe:[view-transition-name:var(--vt-name)]"
										style:--vt-name="desc-{viewTransitionName}"
									>
										{pkg.description}
									</span>
									<span class="font-bold">
										{#if pkg.description}
											•
										{/if}
										<span
											class="motion-safe:[view-transition-name:var(--vt-name)]"
											style:--vt-name="owner-{viewTransitionName}"
										>
											{repoOwner}
										</span>/<span
											class="motion-safe:[view-transition-name:var(--vt-name)]"
											style:--vt-name="repo-name-{viewTransitionName}"
										>
											{repoName}
										</span>
									</span>
								</span>
							</div>
							<span class="mr-1 ml-auto flex shrink-0 items-center gap-1">
								{#await linkedBadgeData then d}
									{@render newBadge(getUnvisitedReleases(pkg.name, d?.releases ?? []).length)}
								{/await}
								<ChevronRight class="transition-transform group-hover:translate-x-1" />
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ul>
