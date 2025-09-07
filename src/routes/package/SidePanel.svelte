<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { browser } from "$app/environment";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { ChevronRight } from "@lucide/svelte";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import type { CategorizedPackage } from "$lib/server/package-discoverer";
	import type { Prettify } from "$lib/types";
	import { cn } from "$lib/utils";
	import { Badge } from "$lib/components/ui/badge";
	import * as Card from "$lib/components/ui/card";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";

	type CleanRelease = { cleanName: string; cleanVersion: string } & GitHubRelease;

	type Props = {
		packageName?: string;
		allPackages?: Prettify<
			Omit<CategorizedPackage, "packages"> & {
				packages: Omit<
					CategorizedPackage["packages"][number],
					"dataFilter" | "metadataFromTag" | "changelogContentsReplacer"
				>[];
			}
		>[];
		otherReleases?: {
			[key: string]: Promise<
				| {
						releasesRepo: Prettify<
							Pick<CategorizedPackage, "category"> &
								Omit<
									CategorizedPackage["packages"][number],
									"dataFilter" | "metadataFromTag" | "changelogContentsReplacer"
								>
						>;
						releases: CleanRelease[] | undefined;
				  }
				| undefined
			>;
		};
		showPrereleases?: boolean;
		headless?: boolean;
		class?: ClassValue;
	};
	let {
		packageName = "",
		allPackages = [],
		showPrereleases = $bindable(true),
		otherReleases = {},
		headless = false,
		class: className
	}: Props = $props();
	let id = $props.id();

	/**
	 * Extract the data from the {@link Props.otherReleases|otherReleases}
	 * props.
	 *
	 * @param pkgName the package name to extract releases fo
	 * @returns the {@link Promise} of releases, or `undefined`
	 */
	function getBadgeDataFromOther(pkgName: string) {
		const data = Object.entries(otherReleases).find(
			([k]) => k.localeCompare(pkgName, undefined, { sensitivity: "base" }) === 0
		);
		if (!data) return undefined;
		const [, v] = data;
		return v;
	}

	/**
	 * Filter the releases to exclude those that have already been seen
	 *
	 * @param pkgName the package name for the releases
	 * @param releases the releases to filter
	 * @returns the filtered releases
	 */
	function getUnvisitedReleases(pkgName: string, releases: CleanRelease[] | undefined) {
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
		<Badge class="shrink-0 px-1 py-0">{count} new</Badge>
	{/if}
{/snippet}

<div
	class={cn(
		"flex flex-col",
		{
			"mb-8 px-5": headless,
			"*:shadow-lg dark:*:shadow-black": !headless
		},
		className
	)}
>
	<Card.Root
		class={{
			"z-10 rounded-md border border-muted-foreground/25 bg-secondary": !headless,
			"border-0 bg-inherit py-0 shadow-none": headless
		}}
	>
		{#if !headless}
			<Card.Header class="grid-cols-2 items-center">
				<Card.Title class="font-display text-2xl">Packages</Card.Title>
				<a
					href={resolve("/packages")}
					class="group ml-auto inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
				>
					See all
					<ChevronRight class="size-4 transition-transform group-hover:translate-x-1" />
				</a>
			</Card.Header>
		{/if}
		<Card.Content class={{ "p-0": headless }}>
			<ul>
				{#each allPackages as { category, packages }, index (category)}
					{#if index > 0}
						<Separator class="my-2 rounded-full bg-muted-foreground" />
					{/if}
					<li class="space-y-2">
						{#if packages.length > 1}
							<!-- Categories with sub-items -->
							<h3 class="text-xl font-bold text-primary">{category.name}</h3>
							<ul class="space-y-2">
								<!-- Sub-items -->
								{#each packages as { pkg } (pkg.name)}
									{@const linkedBadgeData = getBadgeDataFromOther(pkg.name)}
									<li>
										{#if page.url.pathname.endsWith(`/${pkg.name}`)}
											<!-- Active sub-item -->
											<span class="font-semibold">{pkg.name}</span>
										{:else}
											<!-- Clickable sub-items -->
											<a
												href={resolve("/package/[...package]", {
													package: pkg.name
												})}
												class="group inline-flex w-full items-center gap-1"
											>
												<span
													class={[
														"underline-offset-4 group-hover:underline",
														pkg.deprecated &&
															"line-through opacity-75 transition-opacity duration-300 group-hover:opacity-100"
													]}
													title={pkg.deprecated ? `Deprecated: ${pkg.deprecated}` : undefined}
												>
													{pkg.name}
												</span>
												<span class="ml-auto flex items-center gap-1">
													{#if linkedBadgeData}
														{#await linkedBadgeData then data}
															{@render newBadge(
																getUnvisitedReleases(pkg.name, data?.releases).length
															)}
														{/await}
													{/if}
													<ChevronRight
														class="size-4 text-primary transition-transform group-hover:translate-x-1"
													/>
												</span>
											</a>
										{/if}
									</li>
								{/each}
							</ul>
						{:else}
							<!-- Categories with 1 sub-item -->
							{@const firstPackageName = packages[0]?.pkg.name ?? ""}
							{@const linkedBadgeData = getBadgeDataFromOther(firstPackageName)}
							{#if page.url.pathname.endsWith(`/${firstPackageName}`)}
								<!-- Active category -->
								<h3 class="text-xl font-bold text-primary underline underline-offset-4">
									{category.name}
								</h3>
							{:else}
								<!-- Clickable category -->
								<a
									href={resolve("/package/[...package]", {
										package: firstPackageName
									})}
									class="group inline-flex w-full items-center gap-1 text-xl font-bold text-primary"
								>
									<span class="underline-offset-4 group-hover:underline">{category.name}</span>
									<span class="ml-auto flex items-center gap-1">
										{#if linkedBadgeData}
											{#await linkedBadgeData then data}
												{@render newBadge(
													getUnvisitedReleases(firstPackageName, data?.releases).length
												)}
											{/await}
										{/if}
										<ChevronRight
											class="size-4 text-primary transition-transform group-hover:translate-x-1"
										/>
									</span>
								</a>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
	{#if headless}
		<Separator class="my-4" />
	{/if}
	<div
		class={[
			"flex items-center gap-2",
			!headless && "-mt-2 rounded-b-xl border-x border-b bg-card px-4 pt-5 pb-2.5"
		]}
	>
		<Checkbox
			id="beta-releases-{id}"
			aria-labelledby="beta-releases-label-{id}"
			bind:checked={showPrereleases}
		/>
		<Label
			id="beta-releases-label-{id}"
			for="beta-releases-{id}"
			class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			Show {packageName} prereleases
		</Label>
	</div>
</div>
