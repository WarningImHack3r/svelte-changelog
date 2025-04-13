<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { page } from "$app/state";
	import { ChevronRight } from "@lucide/svelte";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import type { CategorizedPackage } from "$lib/server/package-discoverer";
	import type { Prettify } from "$lib/types";
	import { persisted } from "$lib/persisted.svelte";
	import { cn } from "$lib/utils";
	import { Badge } from "$lib/components/ui/badge";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";
	import * as Card from "$lib/components/ui/card";

	type MaybePromise<T> = Promise<T> | T;

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
		otherReleases?: MaybePromise<
			{
				releasesRepo: Prettify<
					Pick<CategorizedPackage, "category"> &
						Omit<
							CategorizedPackage["packages"][number],
							"dataFilter" | "metadataFromTag" | "changelogContentsReplacer"
						>
				>;
				releases: ({ cleanName: string; cleanVersion: string } & GitHubRelease)[];
			}[]
		>;
		showPrereleases?: boolean;
		headless?: boolean;
		class?: ClassValue;
	};
	let {
		packageName = "",
		allPackages = [],
		showPrereleases = $bindable(true),
		otherReleases = [],
		headless = false,
		class: className
	}: Props = $props();
	let id = $props.id();

	let awaitedOtherReleases = $state<Awaited<typeof otherReleases>>([]);
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		otherReleases;
		(async () => {
			awaitedOtherReleases = await otherReleases;
		})();
	});

	let storedPrereleaseState = persisted(`show-${packageName}-prereleases`, showPrereleases);
	$effect(() => {
		storedPrereleaseState.value = showPrereleases;
	});
</script>

{#snippet newBadge(count: number)}
	{#if count > 0}
		<Badge class="px-1 py-0">{count} new</Badge>
	{/if}
{/snippet}

<div class={cn("flex flex-col", !headless && "*:shadow-lg dark:*:shadow-black", className)}>
	<Card.Root
		class={{
			"z-10 border border-muted-foreground/25 bg-secondary": !headless,
			"border-0 bg-inherit shadow-none": headless
		}}
	>
		{#if !headless}
			<Card.Header class="flex-row items-start justify-between">
				<Card.Title class="font-display">Packages</Card.Title>
				<a
					href="/packages"
					class="group inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
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
							<h3 class="text-xl font-bold text-primary">{category.name}</h3>
							<ul class="space-y-2">
								{#each packages as { pkg } (pkg.name)}
									{@const linkedBadgeData =
										awaitedOtherReleases.find(r => r.releasesRepo.pkg.name === pkg.name)
											?.releases ?? []}
									<li>
										{#if page.url.pathname.endsWith(`/${pkg.name}`)}
											<span class="font-semibold">{pkg.name}</span>
										{:else}
											<a
												href="/package/{pkg.name}"
												class="group inline-flex w-full items-center underline-offset-4 hover:underline"
											>
												{pkg.name}
												{@render newBadge(linkedBadgeData.length)}
												<ChevronRight
													class="ml-auto size-4 text-primary transition-transform group-hover:translate-x-1"
												/>
											</a>
										{/if}
									</li>
								{/each}
							</ul>
						{:else}
							{@const firstPackageName = packages[0]?.pkg.name ?? ""}
							{@const linkedBadgeData =
								awaitedOtherReleases.find(r => r.releasesRepo.pkg.name === firstPackageName)
									?.releases ?? []}
							{#if page.url.pathname.endsWith(`/${firstPackageName}`)}
								<h3 class="text-xl font-bold text-primary underline underline-offset-4">
									{category.name}
								</h3>
							{:else}
								<a
									href="/package/{firstPackageName}"
									class="group inline-flex w-full items-center text-xl font-bold text-primary underline-offset-4 hover:underline"
								>
									{category.name}
									{@render newBadge(linkedBadgeData.length)}
									<ChevronRight
										class="ml-auto size-4 text-primary transition-transform group-hover:translate-x-1"
									/>
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
