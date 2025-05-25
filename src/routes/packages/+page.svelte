<script lang="ts">
	import { browser } from "$app/environment";
	import { ChevronRight } from "@lucide/svelte";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";

	let { data } = $props();

	/**
	 * Extract the data from the {@link import('./$types').data.otherReleases|otherReleases}
	 * props.
	 *
	 * @param pkgName the package name to extract releases fo
	 * @returns the {@link Promise} of releases, or `undefined`
	 */
	function getBadgeDataFromOther(pkgName: string) {
		const releases = Object.entries(data.allReleases).find(
			([k]) => k.localeCompare(pkgName, undefined, { sensitivity: "base" }) === 0
		);
		if (!releases) return undefined;
		const [, v] = releases;
		return v;
	}

	/**
	 * Filter the releases to exclude those that have already been seen
	 *
	 * @param pkgName the package name for the releases
	 * @param releases the releases to filter
	 * @returns the filtered releases
	 */
	function getUnvisitedReleases(pkgName: string, releases: GitHubRelease[] | undefined) {
		if (!releases || !browser) return [];

		const lastVisitedItem = localStorage.getItem(`last-visited-${pkgName}`);
		if (!lastVisitedItem) {
			return releases.filter(
				({ created_at, published_at }) =>
					new Date(published_at ?? created_at).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 7
			);
		}
		const lastVisitedDate = new Date(lastVisitedItem);

		return releases.filter(
			({ created_at, published_at }) => new Date(published_at ?? created_at) > lastVisitedDate
		);
	}
</script>

{#snippet newBadge(count: number)}
	{#if count > 0}
		<Badge>{count} new</Badge>
	{/if}
{/snippet}

<ul class="space-y-8">
	{#each data.displayablePackages as { category, packages } (category)}
		<li>
			<h3 class="font-display text-3xl text-primary text-shadow-sm">{category.name}</h3>
			<ul class="mt-2">
				{#each packages as { repoOwner, repoName, pkg }, index (pkg.name)}
					{@const viewTransitionName = pkg.name.replace(/[@/-]/g, "")}
					{@const linkedBadgeData = getBadgeDataFromOther(pkg.name)}
					{#if index > 0}
						<Separator class="mx-auto my-1 w-[95%]" />
					{/if}
					<li>
						<a
							href="/package/{pkg.name}"
							class="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
							title={pkg.deprecated ? `Deprecated: ${pkg.deprecated}` : undefined}
						>
							<div class="flex flex-col">
								<h4
									class="font-medium inline-flex flex-col xs:flex-row items-start motion-safe:[view-transition-name:var(--vt-name)] xs:items-center gap-2"
									style:--vt-name="title-{viewTransitionName}"
								>
									<span
										class={[
											pkg.deprecated &&
												"transition-opacity duration-300 not-group-hover:line-through opacity-75 group-hover:opacity-100"
										]}
									>
										{pkg.name}
									</span>
									{#if pkg.deprecated}
										<Badge variant="outline" class="border-amber-600 text-amber-600 mb-2 xs:mb-0">
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
							<span class="ml-auto mr-1 shrink-0 flex items-center gap-1">
								{#if linkedBadgeData}
									{#await linkedBadgeData then d}
										{@render newBadge(getUnvisitedReleases(pkg.name, d?.releases).length)}
									{/await}
								{/if}
								<ChevronRight class="transition-transform group-hover:translate-x-1" />
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ul>
