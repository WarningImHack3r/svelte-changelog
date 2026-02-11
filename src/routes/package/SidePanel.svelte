<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { ChevronRight, Pin } from "@lucide/svelte";
	import { PersistedState } from "runed";
	import { getBadgeDataFromRecord, getUnvisitedReleases, isPackageNew } from "$lib/badges";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import type { CategorizedPackage } from "$lib/server/package-discoverer";
	import { type PackageSettings, type Prettify, expandStates, releasesTypes } from "$lib/types";
	import { cn } from "$lib/utils";
	import { Badge } from "$lib/components/ui/badge";
	import * as Card from "$lib/components/ui/card";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";
	import { Toggle } from "$lib/components/ui/toggle";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";

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
		otherReleases?: Record<
			string,
			Promise<
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
			>
		>;
		settings: PackageSettings;
		headless?: boolean;
		class?: ClassValue;
	};
	let {
		packageName = "",
		allPackages = [],
		otherReleases = {},
		settings = $bindable(),
		headless = false,
		class: className
	}: Props = $props();
	let id = $props.id();

	// Pins
	let pinnedPackages = new PersistedState<string[]>("sidebar-pinned", []);
	/**
	 * A set proxy to quickly query the pinned items.
	 * Storing a customly serialized SvelteSet in the PersistedState doesn't work
	 * as it isn't reactive (enough).
	 */
	const pinnedROProxy = $derived(new Set(pinnedPackages.current));
</script>

{#snippet newPackageBadge()}
	<Badge class="mr-1 shrink-0 px-1 py-0">New!</Badge>
{/snippet}

{#snippet newCountBadge(count: number)}
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
							{@const sortedPackages = packages.toSorted(({ pkg: pkgA }, { pkg: pkgB }) => {
								const isAPinned = pinnedROProxy.has(pkgA.name);
								const isBPinned = pinnedROProxy.has(pkgB.name);
								return isAPinned === isBPinned ? 0 : isAPinned ? -1 : 1;
							})}
							<!-- Categories with multiple sub-items -->
							<h3 class="text-xl font-bold text-primary" title={category.description}>
								{category.name}
							</h3>
							<ul class="space-y-2">
								<!-- Sub-items -->
								{#each sortedPackages as { pkg } (pkg.name)}
									{@const linkedBadgeData = getBadgeDataFromRecord(otherReleases, pkg.name)}
									<li class="group inline-flex w-full gap-1">
										<Toggle
											aria-label={pinnedROProxy.has(pkg.name)
												? `Unpin ${pkg.name}`
												: `Pin ${pkg.name}`}
											size="sm"
											pressed={pinnedROProxy.has(pkg.name)}
											class="me-0.5 h-auto min-w-0 shrink-0 px-0 hover:bg-inherit hover:text-inherit hover:opacity-100 data-[state=off]:opacity-20 data-[state=off]:group-hover:opacity-50 data-[state=on]:*:fill-amber-500 data-[state=on]:*:stroke-amber-500 hover:data-[state=on]:*:fill-amber-500/30"
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
												{#await linkedBadgeData then data}
													{#if isPackageNew(pkg.name, data?.releases ?? [])}
														{@render newPackageBadge()}
													{/if}
												{/await}
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
													{#await linkedBadgeData then data}
														{#if !isPackageNew(pkg.name, data?.releases ?? [])}
															{@render newCountBadge(
																getUnvisitedReleases(pkg.name, data?.releases ?? []).length
															)}
														{/if}
													{/await}
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
							{@const linkedBadgeData = getBadgeDataFromRecord(otherReleases, firstPackageName)}
							{#if page.url.pathname.endsWith(`/${firstPackageName}`)}
								<!-- Active category -->
								<h3
									class="text-xl font-bold text-primary underline underline-offset-4"
									title={category.description}
								>
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
									{#await linkedBadgeData then data}
										{#if isPackageNew(firstPackageName, data?.releases ?? [])}
											{@render newPackageBadge()}
										{/if}
									{/await}
									<span
										class="underline-offset-4 group-hover:underline"
										title={category.description}
									>
										{category.name}
									</span>
									<span class="ml-auto flex items-center gap-1">
										{#await linkedBadgeData then data}
											{#if !isPackageNew(firstPackageName, data?.releases ?? [])}
												{@render newCountBadge(
													getUnvisitedReleases(firstPackageName, data?.releases ?? []).length
												)}
											{/if}
										{/await}
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
		<Separator class="my-4 rounded-full data-[orientation=horizontal]:h-1" />
		<h3 class="mb-6 text-xl font-semibold tracking-tight text-primary">Visibility settings</h3>
	{/if}
	<div
		class={[
			"flex flex-col gap-2",
			!headless && "-mt-2 rounded-b-xl border-x border-b bg-card px-4 pt-5 pb-2.5"
		]}
	>
		<!-- Prereleases toggle -->
		<div class="flex items-center gap-2">
			<Checkbox
				id="beta-releases-{id}"
				aria-labelledby="beta-releases-label-{id}"
				bind:checked={
					() => settings.showPrereleases, newState => (settings.showPrereleases = newState)
				}
			/>
			<Label
				id="beta-releases-label-{id}"
				for="beta-releases-{id}"
				class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				Show {packageName} prereleases
			</Label>
		</div>

		<Separator class="mt-0.5" />

		<!-- Version filtering -->
		<div
			class={["flex items-center", (headless && "flex-col items-start gap-2") || "justify-between"]}
		>
			<span class="text-sm leading-none font-medium text-nowrap">Show release types:</span>
			<ToggleGroup.Root
				type="single"
				bind:value={
					() => settings.releasesType,
					newType => {
						// don't take in account deselections, naturally always leaving something selected
						if (newType) settings.releasesType = newType;
					}
				}
				size="sm"
				class="border"
			>
				{#each releasesTypes as releaseType (releaseType.toLowerCase())}
					<ToggleGroup.Item value={releaseType.toLowerCase()} class="h-auto py-0.5">
						{releaseType}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>

		<Separator class="mt-0.5" />

		<!-- Expanding/collapsing state -->
		<div
			class={["flex items-center", (headless && "flex-col items-start gap-2") || "justify-between"]}
		>
			<span class="text-sm leading-none font-medium text-nowrap">Initial state:</span>
			<ToggleGroup.Root
				type="single"
				bind:value={
					() => settings.expandState,
					newType => {
						// don't take in account deselections, naturally always leaving something selected
						if (newType) settings.expandState = newType;
					}
				}
				size="sm"
				class="border"
			>
				{#each expandStates as expandState (expandState.toLowerCase())}
					<ToggleGroup.Item
						value={expandState.toLowerCase().replace(/ /g, "-")}
						class="h-auto py-0.5"
					>
						{expandState}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>
	</div>
</div>
