<script lang="ts" module>
	import { siteLang } from "$lib/properties";

	const listFormatter = new Intl.ListFormat(siteLang);
</script>

<script lang="ts">
	import { ChevronUp, CircleAlert, CircleQuestionMark, Info } from "@lucide/svelte";
	import { PersistedState } from "runed";
	import { compare, compareReversed, tryParse } from "verkit";
	import * as Accordion from "$lib/components/ui/accordion";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import TopBanner from "$lib/components/TopBanner.svelte";
	import { groupBy } from "$lib/polyfills";
	import { ALL_SLUG } from "$lib/types";
	import { getRouteReleases } from "./releases.remote";
	import ReleaseCard from "./ReleaseCard.svelte";
	import { getPackageSettings, settingsUtils } from "../settings.svelte";

	type Props = {
		expandable?: string[];
		displayable?: Awaited<ReturnType<typeof getRouteReleases>>["releases"];
	};

	let { expandable = $bindable(), displayable }: Props = $props();

	let { currentPackage, releases = [] } = await getRouteReleases();

	const sharedSettings = getPackageSettings();
	let packageSettings = $derived(sharedSettings.get(currentPackage.pkg.name));

	/**
	 * { "my-package": <release> | undefined }
	 */
	let latestReleases = $derived<Record<string, (typeof releases)[number] | undefined>>(
		/* 4. convert it back to an object (`{ "my-package": GitHubRelease | undefined }`) */
		Object.fromEntries(
			/* 2. convert them to entries for manipulation (`["my-package", GitHubRelease[]][]`) */
			Object.entries(
				/* 1. group releases by package name (`{ "my-package": GitHubRelease[] }`) */
				groupBy(releases, ({ cleanName }) => cleanName)
			).map(
				/* 3. map releases to the latest release for the given package (`["my-package", GitHubRelease | undefined][]`) */
				/* no clue how the releases array can be undefined btw */
				([packageName, releases = []]) => [
					packageName,
					releases
						.filter(({ prerelease }) => !prerelease)
						.toSorted((a, b) => compareReversed(a.cleanVersion, b.cleanVersion))[0]
				]
			)
		)
	);
	/**
	 * { "my-package": { 2: <release> } }
	 *
	 * same logic as for `latestReleases`
	 */
	let earliestsForMajors = $derived<Record<string, Record<number, (typeof releases)[number]>>>(
		Object.fromEntries(
			Object.entries(groupBy(releases, ({ cleanName }) => cleanName)).map(
				([packageName, releases = []]) => {
					const allWithSemver = releases.flatMap(release => {
						const coerced = tryParse(release.cleanVersion);
						return coerced ? [{ coerced, ...release }] : [];
					});
					const uniqueMajors = [...new Set(allWithSemver.map(({ coerced }) => coerced.major))];
					return [
						packageName,
						Object.fromEntries(
							uniqueMajors
								.map(major => {
									const firstSorted = allWithSemver
										.filter(({ coerced, prerelease }) => coerced.major === major && !prerelease)
										.sort((a, b) => compare(a.coerced, b.coerced))[0];
									if (!firstSorted) return undefined;
									const { coerced, ...rest } = firstSorted;
									return [major, rest];
								})
								.filter(Boolean)
						)
					];
				}
			)
		)
	);

	// Persistence
	let activeSettingsReminder = $derived(
		new PersistedState(
			`${currentPackage.pkg.name.toLowerCase().replace(/ /g, "-")}-active-settings-reminder`,
			false,
			{
				storage: "session"
			}
		)
	);

	/**
	 * Regular expressions that represent changelog lines where support for something
	 * new or a new (major) version of something has been added
	 */
	const supportRegexes = [
		// stuff with version
		/: add(?:ed)? (?:experimental )?support for ([\w-]+) v?(\d+)/i,
		/\(\w+\) add(?:ed)? (?:experimental )?support for ([\w-]+) v?(\d+)/i,
		/Add(?:ed)? (?:experimental )?support for ([\w-]+) v?(\d+)/,
		/: ([\w-]+) v?(\d+) support(?: \()?$/i,
		/: support ([\w-]+) v?(\d+)(?: \()?$/i,
		/Support ([\w-]+) v?(\d+)(?: \()?$/,
		// "new" stuff
		/feat: add(?:ed)? (?:experimental )?support for ([\w-]+)(?: \()?$/i,
		/\(feat\) add(?:ed)? (?:experimental )?support for ([\w-]+)(?: \()?$/i,
		/Add(?:ed)? (?:experimental )?support for ([\w-]+)(?: \()?$/
	];
	/**
	 * A blacklist to help avoid false positives; dirty but can't think of a better
	 * solution that would support all the edge cases...
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
	const newLineRegex = /\r?\n/g;
	/**
	 * Computes the packages or package versions for which support
	 * has been added in the current version.
	 *
	 * @param releaseBody the text body of the version
	 * @returns a list of newly supported packages/versions, empty if none
	 */
	function supportAddedFor(releaseBody: string): string[] {
		return currentPackage.category.slug === ALL_SLUG ||
			currentPackage.category.name === currentPackage.pkg.name
			? [] /* even if we technically could, don't show those lines for multi-packages pages as it looks like a mess */
			: releaseBody
					.split(newLineRegex)
					.map(line => {
						for (const regex of supportRegexes) {
							const match = line.match(regex);
							if (match?.[1] && !supportPackagesBlacklist.has(match[1].toLowerCase())) {
								return match[2] ? `${match[1]} ${match[2]}` : match[1];
							}
						}
						return null;
					})
					.filter(Boolean);
	}
</script>

<Accordion.Root type="multiple" bind:value={expandable} class="w-full space-y-2">
	{#if currentPackage.pkg.deprecated}
		<TopBanner
			icon={CircleAlert}
			title="Deprecated"
			markdown={currentPackage.pkg.deprecated}
			class="border-amber-500 bg-amber-400/10 selection:bg-white selection:text-amber-600 prose-a:text-amber-500!"
		/>
	{/if}
	{#if settingsUtils.hasChanged(packageSettings.current) && !activeSettingsReminder.current}
		{let markdown = $derived(
			`The following filters are active:\n${settingsUtils.modificationString(
				packageSettings.current
			)}`
		)}
		<TopBanner
			icon={Info}
			title="Settings changed"
			{markdown}
			class="border-slate-600 bg-slate-400/20 selection:bg-white selection:text-slate-600 prose-a:text-slate-400"
		>
			{#snippet additionalContent()}
				<div class="ms-auto mt-2 flex flex-wrap items-center justify-end-safe gap-x-4 gap-y-2">
					<Button
						variant="link"
						onclick={() => settingsUtils.reset(packageSettings.current)}
						class="h-auto p-0 text-slate-400"
					>
						Reset all filters
					</Button>
					<Button
						variant="link"
						onclick={() => (activeSettingsReminder.current = true)}
						class="h-auto p-0 text-slate-400"
					>
						Remind me later for this package
					</Button>
				</div>
			{/snippet}
		</TopBanner>
	{/if}
	{#each displayable as release, index (release.id)}
		{let latestRelease = $derived(latestReleases[release.cleanName])}
		{let earliestForMajors = $derived(earliestsForMajors[release.cleanName])}
		{let semVersion = $derived(tryParse(release.cleanVersion))}
		{let semLatest = $derived(latestRelease ? tryParse(latestRelease.cleanVersion) : null)}
		{let isMajorRelease = $derived(
			!release.prerelease &&
				semVersion?.minor === 0 &&
				semVersion?.patch === 0 &&
				!semVersion?.prerelease?.length
		)}
		{let earliestOfNextMajor = $derived(
			semVersion ? earliestForMajors?.[semVersion.major + 1] : undefined
		)}
		{let isMaintenance = $derived(
			semVersion && semLatest && earliestOfNextMajor
				? !isMajorRelease &&
						semVersion.major < semLatest.major &&
						new Date(release.published_at ?? release.created_at) >
							new Date(earliestOfNextMajor.published_at ?? earliestOfNextMajor.created_at)
				: false
		)}
		{let addedSupportFor = $derived(supportAddedFor(release.body ?? ""))}
		<ReleaseCard
			{index}
			repo={{ owner: currentPackage.repoOwner, name: currentPackage.repoName }}
			{release}
			isLatest={release.id === latestRelease?.id}
			{isMaintenance}
		/>
		{#if addedSupportFor.length && !release.prerelease && semVersion?.patch === 0}
			<div class="flex items-center gap-2">
				<ChevronUp class="size-4 text-primary" />
				<Separator
					class="grow bg-primary/75 data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-auto"
				/>
				<div class="flex items-center gap-1.5 text-center text-sm font-semibold">
					Support added for {listFormatter.format(addedSupportFor)}
					<Tooltip.Provider delayDuration={300}>
						<Tooltip.Root>
							<Tooltip.Trigger class="hidden opacity-50 hover:opacity-100 md:flex">
								<CircleQuestionMark class="size-4" />
							</Tooltip.Trigger>
							<Tooltip.Content
								class="max-w-prose border bg-popover text-base text-popover-foreground"
								arrowClasses="bg-popover border-b border-r"
							>
								<h3 class="text-md mb-1 font-semibold">What's this?</h3>
								<span>
									This is an experimental detection feature that analyzes the contents of the
									release above, and gets created if relevant. False positives or missing detections
									can happen, please reach out to help improving it!
								</span>
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				</div>
				<Separator
					class="grow bg-primary/75 data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-auto"
				/>
				<ChevronUp class="size-4 text-primary" />
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
