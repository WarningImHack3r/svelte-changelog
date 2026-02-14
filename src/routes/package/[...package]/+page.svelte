<script lang="ts" module>
	const listFormatter = new Intl.ListFormat("en-US");
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { scrollY } from "svelte/reactivity/window";
	import { navigating, page } from "$app/state";
	import { CircleAlert, CircleQuestionMark, Info, LoaderCircle } from "@lucide/svelte";
	import { PersistedState } from "runed";
	import semver from "semver";
	import { ALL_SLUG } from "$lib/types";
	import * as Accordion from "$lib/components/ui/accordion";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import TopBanner from "$lib/components/TopBanner.svelte";
	import { getPackageSettings, settingsUtils } from "../settings.svelte";
	import type { Snapshot } from "./$types";
	import Header from "./Header.svelte";
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

	let latestRelease = $derived(
		data.currentPackage.category.slug === ALL_SLUG
			? undefined
			: data.releases
					.filter(({ prerelease }) => !prerelease)
					.toSorted((a, b) => semver.rcompare(a.cleanVersion, b.cleanVersion))[0]
	);
	let earliestForMajors = $derived.by<Record<number, (typeof data.releases)[number]>>(() => {
		if (data.currentPackage.category.slug === ALL_SLUG) return {};
		const allWithSemver = data.releases.flatMap(release => {
			const coerced = semver.coerce(release.cleanVersion);
			return coerced ? [{ coerced, ...release }] : [];
		});
		const uniqueMajors = [...new Set(allWithSemver.map(({ coerced }) => coerced.major))];
		return Object.fromEntries(
			uniqueMajors
				.map(major => {
					const firstSorted = allWithSemver
						.filter(({ coerced, prerelease }) => coerced.major === major && !prerelease)
						.sort((a, b) => semver.compare(a.coerced, b.coerced))[0];
					if (!firstSorted) return undefined;
					const { coerced, ...rest } = firstSorted;
					return [major, rest];
				})
				.filter(Boolean)
		);
	});
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
				switch (packageSettings.current.expandState) {
					case "collapse-all":
						return false;
					case "expand-all":
						return true;
					case "smart": {
						if (page.url.hash && tag_name.includes(page.url.hash.replace(/^#/, ""))) return true;
						if (displayableReleases.length <= 5) return true;
						// Only expand releases that are less than a week old
						const creationTimestamp = new Date(published_at ?? created_at).getTime();
						if (index === 0 && creationTimestamp > aWeekAgo) return true; // always expand the first release if it is recent enough
						const maxDate = lastUpdateDate?.getTime() ?? aWeekAgo;
						return creationTimestamp > maxDate;
					}
				}
			})
			.map(({ id }) => `${id}`);
	});

	// Hash management
	let wantsReducedMotion = new MediaQuery("prefers-reduced-motion: reduce");
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

	// Persistence
	let activeSettingsReminder = $derived(
		new PersistedState(
			`${data.currentPackage.pkg.name.toLowerCase().replace(/ /g, "-")}-active-settings-reminder`,
			false,
			{
				storage: "session"
			}
		)
	);

	export const snapshot: Snapshot<typeof expandableReleases> = {
		capture: () => expandableReleases,
		restore: item => (expandableReleases = item)
	};

	/**
	 * Regular expressions that represent changelog lines where support for something
	 * new or a new (major) version of something has been added
	 */
	const supportRegexes = [
		// stuff with version
		/: add(?:ed)? (?:experimental )?support for ([\w-]+) v?(\d+)/i,
		/\(\w+\) add(?:ed)? (?:experimental )?support for ([\w-]+) v?(\d+)/i,
		/Add(?:ed)? (?:experimental )?support for ([\w-]+) v?(\d+)/,
		/: ([\w-]+) v?(\d+) support/i,
		/: support ([\w-]+) v?(\d+)/i,
		/Support ([\w-]+) v?(\d+)/,
		// "new" stuff
		/feat: add(?:ed)? (?:experimental )?support for ([\w-]+)/i,
		/\(feat\) add(?:ed)? (?:experimental )?support for ([\w-]+)/i,
		/Add(?:ed)? (?:experimental )?support for ([\w-]+)/
	];
	/**
	 * A blacklist to help avoiding false positives; dirty but can't think of a better
	 * solution that would support all the edge cases..
	 */
	const supportPackagesBlacklist = new Set([
		"loading",
		"the",
		"flat",
		"modern",
		"formatting",
		"object",
		"event",
		"style",
		"generics"
	]);
	/**
	 * Computes the packages or package versions for which support
	 * has been added in the current version.
	 *
	 * @param releaseBody the text body of the version
	 * @returns a list of newly supported packages/versions, empty if none
	 */
	function supportAddedFor(releaseBody: string): string[] {
		return releaseBody
			.split(/\r?\n/g)
			.map(line => {
				for (const regex of supportRegexes) {
					const match = line.match(regex);
					if (match && match[1] && !supportPackagesBlacklist.has(match[1].toLowerCase())) {
						return match[2] ? `${match[1]} ${match[2]}` : match[1];
					}
				}
				return null;
			})
			.filter(Boolean);
	}
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
			<Header
				packageInfo={{
					...data.currentPackage.pkg,
					categorySlug: data.currentPackage.category.slug
				}}
				currentRepo={{
					owner: data.currentPackage.repoOwner,
					name: data.currentPackage.repoName
				}}
				class="my-8 *:w-fit *:max-w-5/6"
			/>
			<Accordion.Root type="multiple" bind:value={expandableReleases} class="w-full space-y-2">
				{#if data.currentPackage.pkg.deprecated}
					<TopBanner
						icon={CircleAlert}
						title="Deprecated"
						markdown={data.currentPackage.pkg.deprecated}
						class="border-amber-500 bg-amber-400/10 prose-a:text-amber-500!"
					/>
				{/if}
				{#if data.currentPackage.pkg.name === "prettier-plugin-svelte"}
					{@const markdown =
						"This package has trouble tagging its releases, and some updates can be missing here. Visit [this issue](https://github.com/sveltejs/prettier-plugin-svelte/issues/497) for more information."}
					<TopBanner
						icon={CircleAlert}
						title="Note"
						{markdown}
						class="border-sky-500 bg-sky-400/20 prose-a:text-sky-500"
					/>
				{/if}
				{#if settingsUtils.hasChanged(packageSettings.current) && !activeSettingsReminder.current}
					{@const markdown = `The following filters are active:\n${settingsUtils.modificationString(
						packageSettings.current
					)}`}
					<TopBanner
						icon={Info}
						title="Settings changed"
						{markdown}
						class="border-slate-600 bg-slate-400/20 prose-a:text-slate-400"
					>
						{#snippet additionalContent()}
							<Button
								variant="link"
								onclick={() => (activeSettingsReminder.current = true)}
								class="ms-auto h-auto p-0 text-slate-400"
							>
								Remind me later for this package
							</Button>
						{/snippet}
					</TopBanner>
				{/if}
				{#each displayableReleases as release, index (release.id)}
					{@const semVersion = semver.coerce(release.cleanVersion)}
					{@const semLatest = semver.coerce(latestRelease?.cleanVersion)}
					{@const isMajorRelease =
						!release.prerelease &&
						semVersion?.minor === 0 &&
						semVersion?.patch === 0 &&
						!semVersion?.prerelease.length}
					{@const earliestOfNextMajor = semVersion
						? earliestForMajors[semVersion.major + 1]
						: undefined}
					{@const isMaintenance =
						semVersion && semLatest && earliestOfNextMajor
							? !isMajorRelease &&
								semVersion.major < semLatest.major &&
								new Date(release.published_at ?? release.created_at) >
									new Date(earliestOfNextMajor.published_at ?? earliestOfNextMajor.created_at)
							: false}
					{@const addedSupportFor = supportAddedFor(release.body ?? "")}
					<ReleaseCard
						{index}
						repo={{ owner: data.currentPackage.repoOwner, name: data.currentPackage.repoName }}
						{release}
						isLatest={release.id === latestRelease?.id}
						{isMaintenance}
					/>
					{#if addedSupportFor.length && !release.prerelease && semVersion?.patch === 0}
						<div class="flex items-center gap-2">
							<Separator
								class="grow rounded-s-full bg-primary/75 data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-auto"
							/>
							<div class="flex items-center gap-1.5 text-center text-sm font-semibold">
								Support added for {listFormatter.format(addedSupportFor)}
								<Tooltip.Provider delayDuration={300}>
									<Tooltip.Root>
										<Tooltip.Trigger class="opacity-50 hover:opacity-100">
											<CircleQuestionMark class="size-4" />
										</Tooltip.Trigger>
										<Tooltip.Content
											class="max-w-prose border bg-popover text-base text-popover-foreground"
											arrowClasses="bg-popover border-b border-r"
										>
											<h3 class="text-md mb-1 font-semibold">What's this?</h3>
											<span>
												This is an experimental detection feature that analyzes the contents of the
												release above, and gets created if relevant. False positives or missing
												detections can happen, please reach out to help improving it!
											</span>
										</Tooltip.Content>
									</Tooltip.Root>
								</Tooltip.Provider>
							</div>
							<Separator
								class="grow rounded-e-full bg-primary/75 data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-auto"
							/>
						</div>
					{/if}
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
