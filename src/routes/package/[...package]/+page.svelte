<script lang="ts">
	import { navigating } from "$app/state";
	import { LoaderCircle, Menu } from "@lucide/svelte";
	import semver from "semver";
	import ReleaseCard from "./ReleaseCard.svelte";
	import SidePanel from "./SidePanel.svelte";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Sheet from "$lib/components/ui/sheet";
	import { Button } from "$lib/components/ui/button";
	import { Skeleton } from "$lib/components/ui/skeleton";

	let { data } = $props();
	let latestRelease = $derived(
		data.releases.toSorted((a, b) => semver.rcompare(a.cleanVersion, b.cleanVersion))[0]
	);
	let earliestOfLatestMajor = $derived(
		data.releases
			.filter(
				({ prerelease, cleanVersion }) =>
					(latestRelease
						? semver.major(cleanVersion) === semver.major(latestRelease.cleanVersion)
						: false) && !prerelease
			)
			.sort((a, b) => semver.compare(a.cleanVersion, b.cleanVersion))[0]
	);
	let showPrereleases = $state(true);
</script>

{#snippet loading()}
	<div class="my-8 space-y-2">
		<Skeleton class="h-16 w-64" />
		<Skeleton class="h-8 w-32" />
	</div>
	<div class="flex gap-8">
		<div class="relative w-full space-y-2">
			<p
				class="absolute top-18 left-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-xl"
			>
				<LoaderCircle class="mr-2 size-4 animate-spin" />
				Loading...
			</p>
			<Skeleton class="h-36 w-full" />
			<Skeleton class="h-44 w-full" />
			<Skeleton class="h-16 w-full" />
			<Skeleton class="h-80 w-full" />
		</div>
		<Skeleton class="h-96 w-1/3" />
	</div>
{/snippet}

{#if navigating.to}
	{@render loading()}
{:else}
	<!-- Required to avoid a layout shift/hydration mismatch for some reason -->
	{#await Promise.resolve()}
		{@render loading()}
	{:then}
		{@const displayableReleases = data.releases.filter(release =>
			showPrereleases ? true : !release.prerelease
		)}
		<div class="my-8 flex gap-8">
			<div>
				<h1 class="text-3xl font-semibold text-primary text-shadow-sm md:text-5xl">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html data.currentPackage.pkg.name.replace(/\//g, "/<wbr />")}
				</h1>
				<h2 class="text-xl text-muted-foreground text-shadow-sm/5">
					{data.currentPackage.owner}/<wbr />{data.currentPackage.repoName}
				</h2>
				{#if data.currentPackage.pkg.description}
					<h3 class="mt-4 italic">{data.currentPackage.pkg.description}</h3>
				{/if}
			</div>
			<Sheet.Root>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="secondary" class="ml-auto lg:hidden">
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
						packageName={data.currentPackage.pkg.name}
						allPackages={data.displayablePackages}
						otherReleases={data.allReleases}
						bind:showPrereleases
						class="my-8"
					/>
				</Sheet.Content>
			</Sheet.Root>
		</div>
		<div class="flex gap-8">
			<Accordion.Root
				type="multiple"
				value={displayableReleases
					// Only expand releases that are less than a week old
					.filter(({ created_at }) => {
						return new Date(created_at).getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
					})
					.map(({ id }) => id.toString())}
				class="w-full space-y-2"
			>
				{#each displayableReleases as release, index (release.id)}
					{@const semVersion = semver.coerce(release.cleanVersion)}
					{@const isMajorRelease =
						!release.prerelease &&
						semVersion?.minor === 0 &&
						semVersion?.patch === 0 &&
						!semVersion?.prerelease.length}
					{@const releaseDate = new Date(release.published_at ?? release.created_at)}
					{@const isLatest = release.id === latestRelease?.id}
					{@const isMaintenance = earliestOfLatestMajor
						? !isMajorRelease &&
							/* `semVersion` and `latestRelease` can't be undefined here */
							semVersion!.major < semver.major(latestRelease!.cleanVersion) &&
							releaseDate >
								new Date(earliestOfLatestMajor.published_at ?? earliestOfLatestMajor.created_at)
						: false}
					<ReleaseCard
						{index}
						packageName={data.currentPackage.pkg.name}
						repo={{ owner: data.currentPackage.owner, name: data.currentPackage.repoName }}
						{release}
						{isLatest}
						{isMaintenance}
					/>
				{/each}
			</Accordion.Root>
			<SidePanel
				packageName={data.currentPackage.pkg.name}
				allPackages={data.displayablePackages}
				otherReleases={data.allReleases}
				class="hidden h-fit w-140 lg:block"
				bind:showPrereleases
			/>
		</div>
	{/await}
{/if}
