<script lang="ts">
	import { untrack } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { scrollY } from "svelte/reactivity/window";
	import { navigating, page } from "$app/state";
	import { ChevronRight, CircleAlert, LoaderCircle, Rss } from "@lucide/svelte";
	import semver from "semver";
	import { ALL_SLUG } from "$lib/types";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import { Separator } from "$lib/components/ui/separator";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import AnimatedCollapsibleContent from "$lib/components/AnimatedCollapsibleContent.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import { getPackageSettings } from "../settings.svelte";
	import type { Snapshot } from "./$types";
	import ReleaseCard from "./ReleaseCard.svelte";

	const loadingSentences = [
		"Loading",
		"Interrogating Rich",
		"Looking for the North Star",
		"Changing the log",
		"Spamming GitHub",
		"Computing stuff in the clouds",
		"gnidaoL",
		"Preparing for TWIS"
	];

	let { data } = $props();
	let viewTransitionName = $derived(data.currentPackage.pkg.name.replace(/[@/-]/g, ""));
	let latestRelease = $derived(
		data.currentPackage.category.slug === ALL_SLUG
			? undefined
			: data.releases.toSorted((a, b) => semver.rcompare(a.cleanVersion, b.cleanVersion))[0]
	);
	let earliestOfLatestMajor = $derived(
		data.currentPackage.category.slug === ALL_SLUG
			? undefined
			: data.releases
					.filter(
						({ prerelease, cleanVersion }) =>
							(latestRelease
								? semver.major(cleanVersion) === semver.major(latestRelease.cleanVersion)
								: false) && !prerelease
					)
					.sort((a, b) => semver.compare(a.cleanVersion, b.cleanVersion))[0]
	);
	const sharedSettings = getPackageSettings();
	let packageSettings = $derived(sharedSettings.get(data.currentPackage.pkg.name));

	let lastUpdateDate = $state<Date>();
	$effect(() => {
		const lastVisit = localStorage.getItem(
			`last-visited-${data.currentPackage.pkg.name.replace(" ", "-")}`
		);
		if (lastVisit) lastUpdateDate = new Date(lastVisit);
		localStorage.setItem(
			`last-visited-${data.currentPackage.pkg.name.replace(" ", "-")}`,
			new Date().toISOString()
		);
	});

	let displayableReleases = $derived(
		data.releases.filter(({ prerelease, cleanVersion }) => {
			const baseCondition = prerelease ? packageSettings.current.showPrereleases : true;
			switch (packageSettings.current.releasesType) {
				case "all":
					return baseCondition;
				case "major":
					return (
						baseCondition && semver.minor(cleanVersion) === 0 && semver.patch(cleanVersion) === 0
					);
				case "minor":
					return (
						baseCondition && semver.minor(cleanVersion) > 0 && semver.patch(cleanVersion) === 0
					);
				case "patch":
					return baseCondition && semver.patch(cleanVersion) > 0;
			}
		})
	);
	let expandableReleases = $derived.by(() => {
		const aWeekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
		return displayableReleases
			.filter(({ created_at, published_at, tag_name }, index) => {
				if (page.url.hash && tag_name.includes(page.url.hash.replace(/^#/, ""))) return true;
				// Only expand releases that are less than a week old
				const creationTimestamp = new Date(published_at ?? created_at).getTime();
				if (index === 0 && creationTimestamp > aWeekAgo) return true; // always expand the first release if it is recent enough
				const maxDate = lastUpdateDate?.getTime() ?? aWeekAgo;
				return creationTimestamp > maxDate;
			})
			.map(({ id }) => `${id}`);
	});

	// Hash management
	let wantsReducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
	$effect(() => {
		if (!page.url.hash || navigating.to || untrack(() => scrollY.current ?? 0) > 0) return;

		Promise.resolve() // match what's performed on the DOM
			.then(() => new Promise(resolve => setTimeout(resolve, 300))) // wait for the accordions to expand (+ better UX)
			.then(() => {
				document
					.getElementById(page.url.hash.replace(/^#/, ""))
					?.scrollIntoView({ behavior: wantsReducedMotion.current ? undefined : "smooth" });
			});
	});

	export const snapshot: Snapshot<typeof expandableReleases> = {
		capture: () => expandableReleases,
		restore: item => (expandableReleases = item)
	};
</script>

{#snippet loading()}
	<div class="flex flex-col">
		<div class="my-8 space-y-2">
			<Skeleton class="h-16 w-64" />
			<Skeleton class="h-8 w-32" />
		</div>
		<div class="relative mt-3 w-full space-y-2">
			<p
				class="absolute top-18 left-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 justify-center text-xl"
			>
				<LoaderCircle class="mr-2 h-lh shrink-0 animate-spin" />
				{loadingSentences[Math.floor(Math.random() * loadingSentences.length)]}...
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
		<div class="flex flex-col">
			<div class="my-8">
				<h1
					class="text-3xl font-semibold text-primary text-shadow-sm motion-safe:[view-transition-name:var(--vt-name)] md:text-5xl"
					style:--vt-name="title-{viewTransitionName}"
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html data.currentPackage.pkg.name.replace(/\//g, "/<wbr />")}
				</h1>
				<div class="flex flex-col items-start xs:flex-row xs:items-center">
					{#if data.currentPackage.repoOwner && data.currentPackage.repoName}
						<h2 class="group text-xl text-muted-foreground text-shadow-sm/5">
							<a
								href="https://github.com/{data.currentPackage.repoOwner}/{data.currentPackage
									.repoName}"
								target="_blank"
								class="underline-offset-2 group-hover:underline after:ml-0.5 after:inline-block after:font-sans after:text-sm after:content-['↗']"
							>
								<span
									class="motion-safe:[view-transition-name:var(--vt-name)]"
									style:--vt-name="owner-{viewTransitionName}"
								>
									{data.currentPackage.repoOwner}
								</span>/<wbr /><span
									class="motion-safe:[view-transition-name:var(--vt-name)]"
									style:--vt-name="repo-name-{viewTransitionName}"
								>
									{data.currentPackage.repoName}
								</span>
							</a>
						</h2>
						<Separator
							orientation="vertical"
							class="mx-2 hidden bg-muted-foreground/50 data-[orientation=vertical]:h-lh xs:block"
						/>
					{/if}
					<Collapsible.Root class="flex items-center">
						<Collapsible.Trigger>
							{#snippet child({ props })}
								<AnimatedButton
									{...props}
									variant="ghost"
									size="sm"
									class="peer h-6 px-1! data-[state=open]:text-primary"
								>
									<Rss />
									<span class="sr-only">RSS</span>
								</AnimatedButton>
								<ChevronRight
									class="size-4 -translate-x-1 scale-75 opacity-0 transition-all peer-hover:translate-x-0 peer-hover:scale-100 peer-hover:opacity-100 peer-data-[state=open]:translate-x-0 peer-data-[state=open]:scale-100 peer-data-[state=open]:rotate-180 peer-data-[state=open]:opacity-100"
								/>
							{/snippet}
						</Collapsible.Trigger>
						<AnimatedCollapsibleContent axis="x" class="ml-2">
							{#each [{ name: "XML", file: "rss.xml" }, { name: "ATOM", file: "atom.xml" }, { name: "JSON", file: "rss.json" }] as { name, file } (name)}
								<Button
									variant="link"
									size="sm"
									class="h-auto px-1 py-0 text-foreground"
									href="{page.url}/{file}"
									data-sveltekit-preload-data="tap"
								>
									{name}
								</Button>
							{/each}
						</AnimatedCollapsibleContent>
					</Collapsible.Root>
				</div>
				{#if data.currentPackage.pkg.description}
					<h3
						class="mt-4 italic motion-safe:[view-transition-name:var(--vt-name)]"
						style:--vt-name="desc-{viewTransitionName}"
					>
						{data.currentPackage.pkg.description}
					</h3>
				{/if}
			</div>
			<Accordion.Root type="multiple" bind:value={expandableReleases} class="w-full space-y-2">
				{#if data.currentPackage.pkg.deprecated}
					<Alert.Root class="rounded-md border-amber-500 bg-amber-400/10">
						<CircleAlert class="size-4" />
						<Alert.Title>Deprecated</Alert.Title>
						<Alert.Description>
							<MarkdownRenderer
								markdown={data.currentPackage.pkg.deprecated}
								inline
								class="max-w-full text-sm text-muted-foreground"
							>
								{#snippet a({ children, ...rest })}
									<a {...rest} target="_blank">
										{@render children?.()}
									</a>
								{/snippet}
							</MarkdownRenderer>
						</Alert.Description>
					</Alert.Root>
				{/if}
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
						repo={{ owner: data.currentPackage.repoOwner, name: data.currentPackage.repoName }}
						{release}
						{isLatest}
						{isMaintenance}
					/>
				{:else}
					<div class="mt-8">
						<p class="font-display text-2xl font-semibold">Nothing to show here!</p>
						<p class="text-lg tracking-tight">
							{#if packageSettings.current.releasesType !== "all" || !packageSettings.current.showPrereleases}
								Try adjusting your visibility settings in the sidebar.
							{:else}
								If there was content, it would be here. Probably.
							{/if}
						</p>
					</div>
				{/each}
			</Accordion.Root>
		</div>
	{/await}
{/if}
