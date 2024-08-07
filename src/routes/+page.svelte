<script lang="ts">
	import { onMount } from "svelte";
	import { get } from "svelte/store";
	import type { Octokit } from "octokit";
	import ArrowUpRight from "lucide-svelte/icons/arrow-up-right";
	import LoaderCircle from "lucide-svelte/icons/loader-circle";
	import { MetaTags } from "svelte-meta-tags";
	import semver from "semver";
	import type { Snapshot } from "./$types";
	import type { Tab } from "../types";
	import { localStorageStore } from "$lib/localStorageStore";
	import { tabState } from "$lib/tabState";
	import { cn } from "$lib/utils";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Tabs from "$lib/components/ui/tabs";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import BlinkingBadge from "$lib/components/BlinkingBadge.svelte";
	import ListElementRenderer from "$lib/renderers/ListElementRenderer.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";

	export let data;

	// Repositories to fetch releases from
	let currentRepo: Tab = "svelte";

	// Tab change
	let tabChangeAsked = false;
	tabState.subscribe(value => {
		if (value === currentRepo) return;
		tabChangeAsked = true;
		window.scrollTo({ top: 0, behavior: "smooth" });
	});

	let scrollY = 0;
	$: if (tabChangeAsked && scrollY === 0) {
		currentRepo = get(tabState);
		tabChangeAsked = false;
	}

	/**
	 * Fetches releases from GitHub for the given category, for
	 * all the repositories in that category.
	 * Also applies the data filter if it exists for the repo.
	 *
	 * @param category The category of the repos to fetch
	 * @returns A promise that resolves to an array of releases
	 */
	async function octokitResponse(category: Tab) {
		if (cachedResponses[category].length) {
			return Promise.resolve(cachedResponses[category]);
		}
		return Promise.all(
			data.repos[category].repos.map(({ repoName, dataFilter }) =>
				data.octokit.rest.repos
					.listReleases({
						owner: "sveltejs",
						repo: repoName,
						per_page: 50
					})
					.then(({ data }) =>
						data
							// Apply repo-specific data filter
							.filter(release => dataFilter?.(release) ?? true)
							// Add repo name to release name if it's not already there
							.map(release => ({
								...release,
								name: release.name?.includes("@")
									? release.name
									: `${repoName}@${release.tag_name.replace(/^v/, "")}`
							}))
					)
			)
		).then(responses => responses.flat());
	}

	type OctokitResponse = Awaited<
		ReturnType<InstanceType<typeof Octokit>["rest"]["repos"]["listReleases"]>
	>["data"];

	// Data caching
	let cachedResponses: Record<Tab, OctokitResponse> = {
		svelte: [],
		kit: [],
		others: []
	};

	export const snapshot: Snapshot<typeof cachedResponses> = {
		capture: () => cachedResponses,
		restore: restored => (cachedResponses = restored)
	};

	// Badges
	let previousTab: Tab = currentRepo;
	let visitedTabs: Tab[] = [];
	let loadedTabs: Tab[] = [];
	let isLoadingDone = false;
	$: if (loadedTabs.length === Object.keys(data.repos).length) {
		isLoadingDone = true;
	}
	const lastVisitKey = "lastVisit" as const;
	let lastVisitDateString = "";

	// Settings
	let displaySvelteBetaReleases = localStorageStore("displaySvelteBetaReleases", true);
	let displayKitBetaReleases = localStorageStore("displayKitBetaReleases", true);
	let displayOtherBetaReleases = localStorageStore("displayOtherBetaReleases", true);

	// Date formatting
	function toRelativeDateString(date: Date) {
		let dateDiff = new Date().getTime() - date.getTime();
		let relevantUnit: Intl.RelativeTimeFormatUnit;
		switch (true) {
			case dateDiff < 1000 * 60:
				dateDiff /= 1000;
				relevantUnit = "seconds";
				break;
			case dateDiff < 1000 * 60 * 60:
				dateDiff /= 1000 * 60;
				relevantUnit = "minutes";
				break;
			case dateDiff < 1000 * 60 * 60 * 24:
				dateDiff /= 1000 * 60 * 60;
				relevantUnit = "hours";
				break;
			default:
				dateDiff /= 1000 * 60 * 60 * 24;
				relevantUnit = "days";
				break;
		}
		return new Intl.RelativeTimeFormat("en", {
			style: "long"
		}).format(-Math.ceil(dateDiff), relevantUnit);
	}

	// Types
	type Entries<T> = {
		[K in keyof T]: [K, T[K]];
	}[keyof T][];

	// https://stackoverflow.com/a/74823834/12070367
	function typedEntries<T extends object>(obj: T) {
		return Object.entries(obj) as Entries<T>;
	}

	onMount(() => {
		// Remove previous settings (will be removed in a future update)
		localStorage.removeItem("displayBetaReleases");
		localStorage.removeItem("nonKitReleasesDisplay");

		// Get the last visit date for the blinking badge
		const localItem = localStorage.getItem(lastVisitKey);
		const nowDate = new Date().toISOString();
		lastVisitDateString = localItem ?? nowDate;
		const timeout = setTimeout(() => {
			localStorage.setItem(lastVisitKey, nowDate);
		}, 5_000);
		return () => clearTimeout(timeout);
	});
</script>

<svelte:window bind:scrollY />

<MetaTags
	title={data.repos[currentRepo].name}
	titleTemplate="%s | Svelte Changelog"
	description="A nice UI to stay up-to-date with Svelte releases"
	canonical="https://svelte-changelog.vercel.app"
	openGraph={{
		images: [
			{
				url: "https://svelte.dev/favicon.png",
				width: 128,
				height: 128,
				alt: "Svelte logo"
			}
		],
		siteName: "Svelte Changelog"
	}}
	twitter={{
		cardType: "summary",
		site: "@probably_coding",
		title: "Svelte Changelog",
		description: "A nice UI to stay up-to-date with Svelte releases",
		image: "https://svelte.dev/favicon.png",
		imageAlt: "Svelte logo"
	}}
	additionalRobotsProps={{
		noarchive: true
	}}
/>

<div class="container py-8">
	<h2 class="text-3xl font-bold">
		<span class="text-primary">{data.repos[currentRepo].name}</span>
		Releases
	</h2>
	<Tabs.Root
		bind:value={currentRepo}
		class="mt-8"
		onValueChange={newValue => {
			const toSet = new Set(visitedTabs);
			toSet.add(previousTab);
			visitedTabs = [...toSet];

			// I have no clue how this can be undefined
			if (newValue) {
				// @ts-expect-error Svelte 5, please
				previousTab = newValue;
			}
		}}
	>
		<div
			class="flex flex-col items-start gap-4 xs:flex-row xs:items-center xs:justify-between xs:gap-0"
		>
			<Tabs.List class="bg-input dark:bg-muted">
				{#each typedEntries(data.repos) as [id, { name }]}
					<BlinkingBadge
						storedDateItem="{id}MostRecentUpdate"
						show={!visitedTabs.includes(id) && id !== currentRepo}
					>
						<Tabs.Trigger
							class="data-[state=inactive]:text-foreground/60 data-[state=inactive]:hover:bg-background/50 data-[state=active]:hover:text-foreground/75 data-[state=inactive]:hover:text-foreground dark:data-[state=inactive]:hover:bg-background/25"
							value={id}
						>
							{name}
						</Tabs.Trigger>
					</BlinkingBadge>
				{/each}
			</Tabs.List>
			<div class="ml-auto flex items-center space-x-2 xs:ml-0">
				<!-- Tab-specific settings -->
				{#if currentRepo === "svelte"}
					<Checkbox
						id="beta-releases-{currentRepo}"
						bind:checked={$displaySvelteBetaReleases}
						aria-labelledby="beta-releases-label-{currentRepo}"
					/>
				{:else if currentRepo === "kit"}
					<Checkbox
						id="beta-releases-{currentRepo}"
						bind:checked={$displayKitBetaReleases}
						aria-labelledby="beta-releases-label-{currentRepo}"
					/>
				{:else}
					<Checkbox
						id="beta-releases-{currentRepo}"
						bind:checked={$displayOtherBetaReleases}
						aria-labelledby="beta-releases-label-{currentRepo}"
					/>
				{/if}
				<Label
					id="beta-releases-label-{currentRepo}"
					for="beta-releases-{currentRepo}"
					class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Show {data.repos[currentRepo].name} prereleases
				</Label>
			</div>
		</div>
		<!-- Tabs content creation -->
		{#each typedEntries(data.repos) as [id, { name, repos: repoList }]}
			<Tabs.Content value={id}>
				<!-- Fetch releases from GitHub -->
				{#await octokitResponse(id)}
					<div class="relative w-full space-y-2">
						<p
							class="absolute left-1/2 top-[4.5rem] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-xl"
						>
							<LoaderCircle class="mr-2 size-4 animate-spin" />
							Loading...
						</p>
						<Skeleton class="h-36 w-full" />
						<Skeleton class="h-44 w-full" />
						<Skeleton class="h-16 w-full" />
						<Skeleton class="h-80 w-full" />
					</div>
				{:then releases}
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					{@const _ = (() => {
						// Cache the response
						cachedResponses[id] = releases;

						// Add tab to loaded tabs
						const toSet = new Set(loadedTabs);
						toSet.add(id);
						loadedTabs = [...toSet];

						// Update the most recent date of a release of the list
						const latestRelease = releases.sort(
							(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
						)[0];
						if (!latestRelease) return false; // boolean because cannot store void in a const
						const storedDate = localStorage.getItem(`${id}MostRecentUpdate`);
						const latestReleaseDate = new Date(latestRelease.created_at);
						if (storedDate) {
							const storedDateObj = new Date(storedDate.replace(/"/g, ""));
							if (latestReleaseDate > storedDateObj) {
								localStorage.setItem(
									`${id}MostRecentUpdate`,
									`"${latestReleaseDate.toISOString()}"`
								);
							}
						} else {
							localStorage.setItem(`${id}MostRecentUpdate`, `"${latestReleaseDate.toISOString()}"`);
						}
					})()}
					<!-- The latest releases for each package of the repoList -->
					{@const latestReleases = (
						id === "others"
							? repoList
									.map(repo => {
										const thisRepoReleases = releases.filter(
											({ prerelease, html_url }) =>
												!prerelease &&
												html_url.startsWith(`https://github.com/sveltejs/${repo.repoName}`)
										);
										const uniquePackages = new Set(
											thisRepoReleases.map(({ tag_name }) => {
												// Not exactly the package name, but the _generic_ part of the tag name
												const pkgFromTag = tag_name.replace(repo.versionFromTag(tag_name), "");
												return pkgFromTag ? pkgFromTag : repo.repoName; // workaround for eslint-config
											})
										);
										return [...uniquePackages].map(
											pkg =>
												thisRepoReleases
													.filter(({ tag_name }) =>
														["eslint-config"].includes(pkg)
															? true // workaround for eslint-config
															: tag_name.includes(pkg)
													)
													.sort((a, b) =>
														semver.rcompare(
															repo.versionFromTag(a.tag_name),
															repo.versionFromTag(b.tag_name)
														)
													)[0]
										);
									})
									.flat()
							: repoList.map(
									repo =>
										releases
											.filter(({ prerelease }) => !prerelease)
											.sort((a, b) =>
												semver.rcompare(
													repo.versionFromTag(a.tag_name),
													repo.versionFromTag(b.tag_name)
												)
											)[0]
								)
					).filter(Boolean)}
					<!-- The earliest version available of the latest major version of each package -->
					{@const earliestOfLatestMajors = (
						id === "others"
							? repoList
									.map(repo => {
										const thisRepoReleases = releases.filter(
											({ prerelease, html_url }) =>
												!prerelease &&
												html_url.startsWith(`https://github.com/sveltejs/${repo.repoName}`)
										);
										const uniquePackages = new Set(
											thisRepoReleases.map(({ tag_name }) => {
												const pkgFromTag = tag_name.replace(repo.versionFromTag(tag_name), "");
												return pkgFromTag ? pkgFromTag : repo.repoName;
											})
										);
										return [...uniquePackages].map(
											pkg =>
												thisRepoReleases
													.filter(({ tag_name }) => {
														const isSamePackage = ["eslint-config"].includes(pkg)
															? true // workaround for eslint-config
															: tag_name.includes(pkg);
														if (!isSamePackage) return false;
														const matchingLatestRelease = latestReleases.find(
															({ html_url, tag_name: latest_tag_name }) =>
																html_url.startsWith(
																	`https://github.com/sveltejs/${repo.repoName}`
																) &&
																latest_tag_name.replace(
																	repo.versionFromTag(latest_tag_name),
																	""
																) === tag_name.replace(repo.versionFromTag(tag_name), "")
														);
														if (!matchingLatestRelease) return false;
														return (
															semver.major(repo.versionFromTag(tag_name)) ===
															semver.major(repo.versionFromTag(matchingLatestRelease.tag_name))
														);
													})
													.sort((a, b) =>
														semver.compare(
															repo.versionFromTag(a.tag_name),
															repo.versionFromTag(b.tag_name)
														)
													)[0]
										);
									})
									.flat()
							: repoList.map(
									repo =>
										releases
											.filter(
												({ prerelease, tag_name }) =>
													!prerelease &&
													(latestReleases[0]
														? semver.major(repo.versionFromTag(latestReleases[0].tag_name)) ===
															semver.major(repo.versionFromTag(tag_name))
														: false)
											)
											.sort((a, b) =>
												semver.compare(
													repo.versionFromTag(a.tag_name),
													repo.versionFromTag(b.tag_name)
												)
											)[0]
								)
					).filter(Boolean)}
					<Accordion.Root
						multiple
						value={releases
							// Only expand releases that are less than a week old
							.filter(release => {
								return (
									new Date(release.created_at).getTime() >
									new Date().getTime() - 1000 * 60 * 60 * 24 * 7
								);
							})
							.map(({ id }) => id.toString())}
					>
						{#each releases
							.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
							.filter(({ prerelease }) => {
								// If not a prerelease, show the release anyway
								if (!prerelease) return true;
								// Filter out beta releases depending on the setting
								switch (id) {
									case "svelte":
										return $displaySvelteBetaReleases;
									case "kit":
										return $displayKitBetaReleases;
									case "others":
										return $displayOtherBetaReleases;
								}
							}) as release (release.id)}
							{@const releaseDate = new Date(release.created_at)}
							{@const isOlderThanAWeek =
								releaseDate.getTime() < new Date().getTime() - 1000 * 60 * 60 * 24 * 7}
							{@const isMajorRelease = release.tag_name.includes(".0.0") && !release.prerelease}
							{@const isLatestRelease = latestReleases.map(({ id }) => id).includes(release.id)}
							{@const releaseRepo = repoList.find(({ repoName }) =>
								release.html_url.startsWith(`https://github.com/sveltejs/${repoName}`)
							)}
							{@const matchingLatestRelease = latestReleases.find(({ html_url, tag_name }) =>
								releaseRepo
									? html_url.startsWith(`https://github.com/sveltejs/${releaseRepo.repoName}`) &&
										tag_name.replace(releaseRepo.versionFromTag(tag_name), "") ===
											release.tag_name.replace(releaseRepo.versionFromTag(release.tag_name), "")
									: false
							)}
							{@const matchingEarliestOfLatestMajor = earliestOfLatestMajors.find(
								({ html_url, tag_name }) =>
									releaseRepo
										? html_url.startsWith(`https://github.com/sveltejs/${releaseRepo.repoName}`) &&
											tag_name.replace(releaseRepo.versionFromTag(tag_name), "") ===
												release.tag_name.replace(releaseRepo.versionFromTag(release.tag_name), "")
										: false
							)}
							{@const isMaintenanceRelease =
								releaseRepo && matchingLatestRelease && matchingEarliestOfLatestMajor
									? !isMajorRelease &&
										semver.major(releaseRepo.versionFromTag(release.tag_name)) <
											semver.major(releaseRepo.versionFromTag(matchingLatestRelease.tag_name)) &&
										releaseDate > new Date(matchingEarliestOfLatestMajor.created_at)
									: false}
							{@const releaseBody = (() => {
								const body = release.body ?? "";
								if (releaseRepo?.repoName !== "language-tools") return body;
								// Add missing links to PRs in the release body
								return body.replace(
									/\(#(\d+)\)/g, // Match all `(#1234)` patterns
									(_, prNumber) => {
										const prUrl = `https://github.com/sveltejs/${releaseRepo.repoName}/pull/${prNumber}`;
										return `([#${prNumber}](${prUrl}))`;
									}
								);
							})()}
							<Accordion.Item value={release.id.toString()}>
								<!-- Trigger with release name, date and optional prerelease badge -->
								<Accordion.Trigger class="group hover:no-underline">
									<div class="flex w-full items-center gap-2 xs:items-baseline xs:gap-1">
										<!-- Trigger reactivity (please give me Svelte 5) -->
										{#key isLoadingDone}
											{#if releaseDate > new Date(lastVisitDateString) && !visitedTabs.includes(id)}
												<div class="relative ml-1 mr-2 inline-flex">
													<span
														class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
													/>
													<span class="inline-flex size-2.5 rounded-full bg-primary" />
												</div>
											{/if}
										{/key}
										<div class="flex flex-col items-start gap-1">
											<span class="text-left text-lg group-hover:underline">
												{release.name}
											</span>
											<div class="flex items-center gap-2 xs:hidden">
												{#if isLatestRelease}
													<Tooltip.Root openDelay={300}>
														<Tooltip.Trigger>
															<Badge
																class="bg-green-600 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-700"
															>
																Latest
															</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															{#if id === "others"}
																This is a latest stable release
															{:else}
																This is the latest stable release of {name}
															{/if}
														</Tooltip.Content>
													</Tooltip.Root>
												{/if}
												{#if isMajorRelease}
													<Tooltip.Root openDelay={300}>
														<Tooltip.Trigger>
															<Badge>Major</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															Major update (e.g.: 1.0.0, 2.0.0, 3.0.0...)
														</Tooltip.Content>
													</Tooltip.Root>
												{:else if release.prerelease}
													<Tooltip.Root openDelay={300}>
														<Tooltip.Trigger>
															<Badge variant="outline" class="border-primary text-primary">
																Prerelease
															</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															This version is an alpha or a beta, unstable version{id === "others"
																? ""
																: ` of ${name}`}
														</Tooltip.Content>
													</Tooltip.Root>
												{:else if isMaintenanceRelease}
													<Tooltip.Root openDelay={300}>
														<Tooltip.Trigger>
															<Badge variant="outline" class="border-blue-600 text-blue-600">
																Maintenance
															</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															An update bringing bug fixes and minor improvements to an older major
															version
														</Tooltip.Content>
													</Tooltip.Root>
												{/if}
											</div>
										</div>
										<span
											class="ml-auto mr-4 flex text-right text-sm text-muted-foreground xs:ml-0 xs:mr-2"
										>
											<span class="mr-1 hidden xs:block">•</span>
											<Tooltip.Root openDelay={300}>
												<Tooltip.Trigger>
													{isOlderThanAWeek
														? releaseDate.toLocaleDateString("en")
														: toRelativeDateString(releaseDate)}
												</Tooltip.Trigger>
												<Tooltip.Content>
													{isOlderThanAWeek
														? toRelativeDateString(releaseDate)
														: new Intl.DateTimeFormat("en", {
																dateStyle: "medium",
																timeStyle: "short"
															}).format(releaseDate)}
												</Tooltip.Content>
											</Tooltip.Root>
										</span>
										<div class="hidden items-center gap-2 xs:flex">
											{#if isLatestRelease}
												<Tooltip.Root openDelay={300}>
													<Tooltip.Trigger>
														<Badge
															class="bg-green-600 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-700"
														>
															Latest
														</Badge>
													</Tooltip.Trigger>
													<Tooltip.Content>
														{#if id === "others"}
															This is a latest stable release
														{:else}
															This is the latest stable release of {name}
														{/if}
													</Tooltip.Content>
												</Tooltip.Root>
											{/if}
											{#if isMajorRelease}
												<Tooltip.Root openDelay={300}>
													<Tooltip.Trigger>
														<Badge>Major</Badge>
													</Tooltip.Trigger>
													<Tooltip.Content>
														Major update (e.g.: 1.0.0, 2.0.0, 3.0.0...)
													</Tooltip.Content>
												</Tooltip.Root>
											{:else if release.prerelease}
												<Tooltip.Root openDelay={300}>
													<Tooltip.Trigger>
														<Badge variant="outline" class="border-primary text-primary">
															Prerelease
														</Badge>
													</Tooltip.Trigger>
													<Tooltip.Content>
														This version is an alpha or a beta, unstable version{id === "others"
															? ""
															: ` of ${name}`}
													</Tooltip.Content>
												</Tooltip.Root>
											{:else if isMaintenanceRelease}
												<Tooltip.Root openDelay={300}>
													<Tooltip.Trigger>
														<Badge variant="outline" class="border-blue-600 text-blue-600">
															Maintenance
														</Badge>
													</Tooltip.Trigger>
													<Tooltip.Content>
														An update bringing bug fixes and minor improvements to an older major
														version
													</Tooltip.Content>
												</Tooltip.Root>
											{/if}
										</div>
									</div>
								</Accordion.Trigger>
								<!-- Accordion content with markdown body and a link to open it on GitHub -->
								<Accordion.Content>
									<div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-0">
										<MarkdownRenderer
											markdown={releaseBody}
											additionalPlugins={[{ renderer: { li: ListElementRenderer } }]}
											class="prose-sm max-w-full prose-p:my-0"
										/>
										<!-- Open the release on GitHub in a new tab, with a nice hover animation -->
										<Button
											href={release.html_url}
											target="_blank"
											class="group mb-4 ml-auto mr-8 font-semibold dark:text-black sm:ml-0 sm:mt-auto"
										>
											Open on <img src="/github.svg" alt="GitHub" class="ml-1.5 size-5" />
											<ArrowUpRight
												class="ml-2 size-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
											/>
										</Button>
									</div>
								</Accordion.Content>
							</Accordion.Item>
						{/each}
					</Accordion.Root>
					<!-- Tab's footer linking to more (all) releases -->
					<span class="mt-8 flex justify-center">
						<em class="text-center text-sm text-muted-foreground">
							{releases.length} results are shown. If you want to see more releases,
							{#if id !== "others"}
								please visit
								<a
									href="https://github.com/sveltejs/{id}/releases"
									target="_blank"
									class={cn(
										buttonVariants({
											variant: "link"
										}),
										"h-auto p-0"
									)}
								>
									{name}'s releases page
								</a>.
							{:else}
								please visit each package's releases page.
							{/if}
						</em>
					</span>
				{:catch error}
					<!-- Error on fetch fail -->
					<p class="text-red-500">{error.message}</p>
				{/await}
			</Tabs.Content>
		{/each}
	</Tabs.Root>
</div>
