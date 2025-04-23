<script lang="ts">
	import { navigating } from "$app/state";
	import { LoaderCircle } from "@lucide/svelte";
	import semver from "semver";
	import ReleaseCard from "./ReleaseCard.svelte";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import * as Accordion from "$lib/components/ui/accordion";

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

	$effect(() => {
		localStorage.setItem(`last-visited-${data.currentPackage.pkg.name}`, new Date().toISOString());
	});
</script>

{#snippet loading()}
	<div class="flex flex-col">
		<div class="my-8 space-y-2">
			<Skeleton class="h-16 w-64" />
			<Skeleton class="h-8 w-32" />
		</div>
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
	</div>
{/snippet}

{#if navigating.to}
	{@render loading()}
{:else}
	<!-- Required to avoid a layout shift/hydration mismatch for some reason -->
	{#await Promise.resolve()}
		{@render loading()}
	{:then}
		{@const displayableReleases = data.releases.filter(
			release => showPrereleases || !release.prerelease
		)}
		<div class="flex flex-col">
			<div class="my-8">
				<h1 class="text-3xl font-semibold text-primary text-shadow-sm md:text-5xl">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html data.currentPackage.pkg.name.replace(/\//g, "/<wbr />")}
				</h1>
				<h2 class="text-xl text-muted-foreground text-shadow-sm/5">
					<a
						href="https://github.com/{data.currentPackage.owner}/{data.currentPackage.repoName}"
						target="_blank"
						class="underline-offset-2 after:ml-0.5 after:inline-block after:-translate-x-2 after:font-sans after:text-sm after:opacity-0 after:transition after:content-['↗'] hover:underline hover:after:translate-x-0 hover:after:opacity-100"
					>
						{data.currentPackage.owner}/<wbr />{data.currentPackage.repoName}
					</a>
				</h2>
				{#if data.currentPackage.pkg.description}
					<h3 class="mt-4 italic">{data.currentPackage.pkg.description}</h3>
				{/if}
			</div>
			<Accordion.Root
				type="multiple"
				value={displayableReleases
					// Only expand releases that are less than a week old
					.filter(
						({ created_at }) =>
							new Date(created_at).getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 7
					)
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
		</div>
	{/await}
{/if}
