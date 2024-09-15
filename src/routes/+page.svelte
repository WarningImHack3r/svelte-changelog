<script lang="ts">
	import { onMount } from "svelte";
	import type { TabsProps } from "bits-ui";
	import { ArrowUpRight, LoaderCircle } from "lucide-svelte";
	import type { Octokit } from "octokit";
	import semver from "semver";
	import { MetaTags } from "svelte-meta-tags";
	import { persisted } from "svelte-persisted-store";
	import { queryParam } from "sveltekit-search-params";
	import type { Snapshot } from "./$types";
	import { availableTabs, type Tab } from "$lib/types";
	import { FAVICON_PNG_URL, PROD_URL } from "$lib/config";
	import { getOctokit } from "$lib/octokit";
	import parseChangelog from "$lib/changelog-parser";
	import { getTabState } from "$lib/stores";
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
	import ListElementRenderer from "$lib/components/renderers/ListElementRenderer.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import { decodeBase64, scrollToAsync, toRelativeDateString, typedEntries } from "$lib/util";

	export let data;
	$: ({ repos } = data);

	const octokit = getOctokit();

	let currentTab: Tab = "svelte";

	function onTabChange(newTab: TabsProps["value"]) {
		const toSet = new Set(visitedTabs);
		toSet.add(previousTab);
		visitedTabs = [...toSet];

		if (!newTab) return;
		previousTab = newTab as Tab;
		tabParam.set(previousTab);
		tabState.set(previousTab);
	}

	// Tab change from the store (layout)
	const tabState = getTabState();
	$: if ($tabState && $tabState !== currentTab) {
		scrollToAsync().then(() => {
			currentTab = $tabState;
			onTabChange($tabState);
		});
	}

	// Tab change from the URL
	const tabParam = queryParam<Tab>("tab");
	$: if ($tabParam && availableTabs.includes($tabParam)) {
		currentTab = $tabParam;
		onTabChange($tabParam);
	}

	type Releases = Awaited<
		ReturnType<InstanceType<typeof Octokit>["rest"]["repos"]["listReleases"]>
	>["data"];

	/**
	 * Fetches releases from GitHub for the given category, for
	 * all the repositories in that category.
	 * Also applies the data filter if it exists for the repo.
	 *
	 * @param category The category of the repos to fetch
	 * @returns A promise that resolves to an array of releases
	 */
	async function fetchReleases(category: Tab): Promise<Releases> {
		if (cachedResponses[category].length) {
			return Promise.resolve(cachedResponses[category]);
		}
		return Promise.all(
			repos[category].repos.map(
				async (
					{ changesMode, repoName, dataFilter, versionFromTag, changelogContentsReplacer },
					repoIndex
				) => {
					if (changesMode === "changelog") {
						const { data: tags } = await octokit.rest.repos.listTags({
							owner: "sveltejs",
							repo: repoName
						});
						return octokit.rest.repos
							.getContent({
								owner: "sveltejs",
								repo: repoName,
								path: "CHANGELOG.md"
							})
							.then(async ({ data }) => {
								if ("length" in data || !("content" in data)) return []; // filter out empty or multiple results
								const { content, encoding, type } = data;
								if (type !== "file" || !content) return []; // filter out directories and empty files
								const changelogFileContents =
									encoding === "base64" ? decodeBase64(content) : content;
								// Return a recreated list of releases from the changelog file
								const { versions } = await parseChangelog(
									changelogContentsReplacer?.(changelogFileContents) ?? changelogFileContents
								);
								return (
									await Promise.all(
										tags.map(
											async (
												{ name: tagName, commit: { sha }, zipball_url, tarball_url, node_id },
												tagIndex
											) => {
												const { author, committer } = await octokit.rest.git
													.getCommit({
														owner: "sveltejs",
														repo: repoName,
														commit_sha: sha
													})
													.then(({ data }) => data);
												const cleanVersion = versionFromTag(tagName);
												const changelogVersion = versions.find(
													({ version }) => version === cleanVersion
												);
												return {
													url: "",
													html_url: `https://github.com/sveltejs/${repoName}/releases/tag/${tagName}`,
													assets_url: "",
													upload_url: "",
													tarball_url,
													zipball_url,
													id: tagIndex + repoIndex * 1000,
													node_id,
													tag_name: cleanVersion,
													target_commitish: "main",
													name: `${repoName}@${cleanVersion}`,
													body: changelogVersion?.body ?? "_No changelog provided._",
													draft: false,
													prerelease: cleanVersion.includes("-"),
													created_at: committer.date,
													published_at: null,
													author: {
														name: author.name,
														login: "",
														email: author.email,
														id: 0,
														node_id: "",
														avatar_url: "",
														gravatar_id: null,
														url: "",
														html_url: "",
														followers_url: "",
														following_url: "",
														gists_url: "",
														starred_url: "",
														subscriptions_url: "",
														organizations_url: "",
														repos_url: "",
														events_url: "",
														received_events_url: "",
														type: "",
														site_admin: false
													},
													assets: []
												} satisfies Releases[number];
											}
										)
									)
								).filter(
									release =>
										// Apply repo-specific data filter
										dataFilter?.(release) ?? true
								);
							})
							.catch(() => []);
					}
					return octokit.rest.repos
						.listReleases({
							owner: "sveltejs",
							repo: repoName,
							per_page: 50
						})
						.then(({ data }) =>
							// Apply repo-specific data filter
							data.filter(release => dataFilter?.(release) ?? true)
						);
				}
			)
		).then(responses => responses.flat());
	}

	// Data caching
	let cachedResponses: Record<Tab, Releases> = {
		svelte: [],
		kit: [],
		others: []
	};

	export const snapshot: Snapshot<typeof cachedResponses> = {
		capture: () => cachedResponses,
		restore: restored => (cachedResponses = restored)
	};

	// Badges
	let previousTab: Tab = currentTab;
	let visitedTabs: Tab[] = [];
	let loadedTabs: Tab[] = [];
	let isLoadingDone = false;
	$: if (loadedTabs.length === Object.keys(repos).length) {
		isLoadingDone = true;
	}
	const lastVisitKey = "lastVisit" as const;
	let lastVisitDateString = "";

	// Settings
	let displaySvelteBetaReleases = persisted("displaySvelteBetaReleases", true);
	let displayKitBetaReleases = persisted("displayKitBetaReleases", true);
	let displayOtherBetaReleases = persisted("displayOtherBetaReleases", true);

	onMount(() => {
		// Remove previous settings (will be removed in a future update)
		localStorage.removeItem("displayBetaReleases");
		localStorage.removeItem("nonKitReleasesDisplay");
		localStorage.removeItem("settings");

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

<MetaTags
	title={repos[currentTab].name}
	titleTemplate="%s | Svelte Changelog"
	description="A nice UI to stay up-to-date with Svelte releases"
	canonical={PROD_URL}
	openGraph={{
		images: [
			{
				url: FAVICON_PNG_URL,
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
		image: FAVICON_PNG_URL,
		imageAlt: "Svelte logo"
	}}
	additionalRobotsProps={{
		noarchive: true
	}}
/>

<div class="container py-8">
	<h2 class="text-3xl font-bold">
		<span class="text-primary">{repos[currentTab].name}</span>
		Releases
	</h2>
	<Tabs.Root bind:value={currentTab} class="mt-8" onValueChange={onTabChange}>
		<div
			class="flex flex-col items-start gap-4 xs:flex-row xs:items-center xs:justify-between xs:gap-0"
		>
			<Tabs.List class="bg-input dark:bg-muted">
				{#each typedEntries(repos) as [id, { name }]}
					<BlinkingBadge
						storedDateItem="{id}MostRecentUpdate"
						show={!visitedTabs.includes(id) && id !== currentTab}
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
				{#if currentTab === "svelte"}
					<Checkbox
						id="beta-releases-{currentTab}"
						bind:checked={$displaySvelteBetaReleases}
						aria-labelledby="beta-releases-label-{currentTab}"
					/>
				{:else if currentTab === "kit"}
					<Checkbox
						id="beta-releases-{currentTab}"
						bind:checked={$displayKitBetaReleases}
						aria-labelledby="beta-releases-label-{currentTab}"
					/>
				{:else}
					<Checkbox
						id="beta-releases-{currentTab}"
						bind:checked={$displayOtherBetaReleases}
						aria-labelledby="beta-releases-label-{currentTab}"
					/>
				{/if}
				<Label
					id="beta-releases-label-{currentTab}"
					for="beta-releases-{currentTab}"
					class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Show {repos[currentTab].name} prereleases
				</Label>
			</div>
		</div>
		<!-- Tabs content creation -->
		{#each typedEntries(repos) as [id, { name, repos: repoList }]}
			<Tabs.Content value={id}>
				<!-- Fetch releases from GitHub -->
				{#await fetchReleases(id)}
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
									.map(({ repoName, versionFromTag }) => {
										const thisRepoReleases = releases.filter(
											({ prerelease, html_url }) =>
												!prerelease &&
												html_url.startsWith(`https://github.com/sveltejs/${repoName}`)
										);
										const uniquePackages = new Set(
											thisRepoReleases.map(({ tag_name }) => {
												// Not exactly the package name, but the _generic_ part of the tag name
												const pkgFromTag = tag_name.replace(versionFromTag(tag_name), "");
												return pkgFromTag ?? repoName; // workaround for eslint-config
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
														semver.rcompare(versionFromTag(a.tag_name), versionFromTag(b.tag_name))
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
							.filter(({ created_at }) => {
								return (
									new Date(created_at).getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 7
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
							{@const releaseName = (() => {
								if (!releaseRepo) return release.name;
								const packageName = release.tag_name
									.replace(releaseRepo.versionFromTag(release.tag_name), "")
									.replace(/-$/, "");
								return release.name?.includes("@")
									? release.name
									: `${
											/^[\d.]+/.test(release.tag_name.replace(/^v/, ""))
												? releaseRepo.repoName
												: packageName
										}@${releaseRepo.versionFromTag(release.tag_name)}`;
							})()}
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
												{releaseName}
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
