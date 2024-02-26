<script lang="ts">
	import { Octokit } from "octokit";
	import ArrowUpRight from "lucide-svelte/icons/arrow-up-right";
	import Loader2 from "lucide-svelte/icons/loader-2";
	import { MetaTags } from "svelte-meta-tags";
	import Markdown from "svelte-exmarkdown";
	import semver from "semver";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import { localStorageStore } from "$lib/localStorageStore";
	import { cn } from "$lib/utils";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Tabs from "$lib/components/ui/tabs";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import ListElementRenderer from "./renderers/ListElementRenderer.svelte";

	// Repositories to fetch releases from
	const repos = {
		svelte: "Svelte",
		kit: "SvelteKit"
	} as const;
	let currentRepo: keyof typeof repos = "svelte";

	// Svelte setting
	let displayBetaReleases = localStorageStore("displayBetaReleases", true);

	// SvelteKit setting
	const nonKitReleasesOptions = ["show", "dim", "hide"] as const;
	let nonKitReleasesDisplay = localStorageStore<(typeof nonKitReleasesOptions)[number]>(
		"nonKitReleasesDisplay",
		"dim"
	);

	// GitHub API client
	const octokit = new Octokit();

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
			case dateDiff < 1000 * 60 * 60 * 24 * 8: // 8 days instead of 7 to display "7 days ago" instead of "1 week ago" / regular date
				dateDiff /= 1000 * 60 * 60 * 24;
				relevantUnit = "days";
				break;
			default:
				return date.toLocaleDateString();
		}
		// formatting to english because it would be the only thing localized otherwise
		return new Intl.RelativeTimeFormat("en", {
			style: "long"
		}).format(-Math.ceil(dateDiff), relevantUnit);
	}
</script>

<MetaTags
	title={repos[currentRepo]}
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
		<span class="text-primary">{repos[currentRepo]}</span>
		Releases
	</h2>
	<Tabs.Root bind:value={currentRepo} class="mt-8">
		<div
			class="flex flex-col items-start gap-4 xs:flex-row xs:items-center xs:justify-between xs:gap-0"
		>
			<Tabs.List class="bg-input dark:bg-muted">
				{#each Object.entries(repos) as [id, name]}
					<Tabs.Trigger
						class="data-[state=inactive]:text-foreground/60 data-[state=inactive]:hover:bg-background/50 data-[state=active]:hover:text-foreground/75 data-[state=inactive]:hover:text-foreground dark:data-[state=inactive]:hover:bg-background/25"
						value={id}
					>
						{name}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
			<div class="ml-auto flex items-center space-x-2 xs:ml-0">
				<!-- Tab-specific settings -->
				{#if currentRepo === "svelte"}
					<Checkbox
						id="beta-releases"
						bind:checked={$displayBetaReleases}
						aria-labelledby="beta-releases-label"
					/>
					<Label
						id="beta-releases-label"
						for="beta-releases"
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Show prereleases
					</Label>
				{:else}
					<span class="text-sm text-muted-foreground">Non-SvelteKit releases:</span>
					<ToggleGroup.Root
						bind:value={$nonKitReleasesDisplay}
						size="sm"
						class="scale-90 rounded-md outline outline-offset-4 outline-input"
					>
						{#each nonKitReleasesOptions as option}
							<ToggleGroup.Item value={option}>
								{option.charAt(0).toUpperCase() + option.slice(1)}
							</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>
				{/if}
			</div>
		</div>
		<!-- Tabs content creation -->
		{#each Object.entries(repos) as [repo, name]}
			<Tabs.Content value={repo}>
				<!-- Fetch releases from GitHub -->
				{#await octokit.rest.repos.listReleases({ owner: "sveltejs", repo, per_page: 50 })}
					<div class="relative w-full space-y-2">
						<p
							class="absolute left-1/2 top-[4.5rem] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-xl"
						>
							<Loader2 class="mr-2 size-4 animate-spin" />
							Loading...
						</p>
						<Skeleton class="h-36 w-full" />
						<Skeleton class="h-44 w-full" />
						<Skeleton class="h-16 w-full" />
						<Skeleton class="h-80 w-full" />
					</div>
				{:then { data }}
					{@const latestRelease = data
						.filter(release => release.tag_name.includes(`${repo}@`) && !release.prerelease)
						.sort((a, b) =>
							semver.rcompare(
								a.tag_name.substring(a.tag_name.lastIndexOf("@") + 1),
								b.tag_name.substring(b.tag_name.lastIndexOf("@") + 1)
							)
						)[0]}
					{@const earliestOfLatestMajor = data
						.filter(
							release =>
								release.tag_name.includes(`${repo}@`) &&
								!release.prerelease &&
								(latestRelease
									? semver.major(
											latestRelease.tag_name.substring(latestRelease.tag_name.lastIndexOf("@") + 1)
										) ===
										semver.major(release.tag_name.substring(release.tag_name.lastIndexOf("@") + 1))
									: true)
						)
						.sort((a, b) =>
							semver.compare(
								a.tag_name.substring(a.tag_name.lastIndexOf("@") + 1),
								b.tag_name.substring(b.tag_name.lastIndexOf("@") + 1)
							)
						)[0]}
					<Accordion.Root
						multiple
						value={data
							// Only expand releases that are less than a week old and are Svelte or SvelteKit releases
							.filter(release => {
								const isLessThanAWeekOld =
									new Date(release.created_at).getTime() >
									new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
								return (
									isLessThanAWeekOld &&
									(repo === "kit" ? release.name?.startsWith("@sveltejs/kit") : true)
								);
							})
							.map(release => release.id.toString())}
					>
						{#each data
							.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
							.filter(release => {
								// Filter out Svelte beta releases depending on the setting
								if (repo === "svelte" && release.prerelease) return $displayBetaReleases;
								// Filter out non-SvelteKit releases depending on the setting
								if (repo === "kit" && !release.name?.startsWith("@sveltejs/kit")) return $nonKitReleasesDisplay !== "hide";
								// Else, show the release
								return true;
							}) as release (release.id)}
							{@const releaseDate = new Date(release.created_at)}
							{@const isMajorRelease = release.tag_name?.includes(".0.0") && !release.prerelease}
							{@const isLatestRelease = latestRelease?.id === release.id}
							{@const isMaintenanceRelease =
								latestRelease && earliestOfLatestMajor
									? !isMajorRelease &&
										!release.prerelease &&
										release.tag_name.includes(`${repo}@`) &&
										semver.major(
											release.tag_name.substring(release.tag_name.lastIndexOf("@") + 1)
										) <
											semver.major(
												latestRelease.tag_name.substring(
													latestRelease.tag_name.lastIndexOf("@") + 1
												)
											) &&
										releaseDate.getTime() > new Date(earliestOfLatestMajor.created_at).getTime()
									: false}
							<Accordion.Item value={release.id.toString()}>
								<!-- Trigger with release name, date and optional prerelease badge -->
								<Accordion.Trigger class="group hover:no-underline">
									<div class="flex w-full items-center gap-2 xs:items-baseline xs:gap-1">
										<div class="flex flex-col items-start gap-1">
											<span
												class="text-left text-lg group-hover:underline"
												class:text-muted-foreground={repo === "kit" &&
													!release.name?.startsWith("@sveltejs/kit") &&
													$nonKitReleasesDisplay === "dim"}
											>
												{release.name}
											</span>
											<div class="flex items-center gap-2 xs:hidden">
												{#if isLatestRelease}
													<Tooltip.Root>
														<Tooltip.Trigger>
															<Badge
																class="bg-green-600 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-700"
															>
																Latest
															</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															This is the latest stable release of {repos[repo]}
														</Tooltip.Content>
													</Tooltip.Root>
												{/if}
												{#if isMajorRelease}
													<Tooltip.Root>
														<Tooltip.Trigger>
															<Badge>Major</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															Major update (e.g.: 1.0.0, 2.0.0, 3.0.0...)
														</Tooltip.Content>
													</Tooltip.Root>
												{:else if release.prerelease}
													<Tooltip.Root>
														<Tooltip.Trigger>
															<Badge variant="outline" class="border-primary text-primary">
																Prerelease
															</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															This version is a alpha or a beta, unstable version of {repos[repo]}
														</Tooltip.Content>
													</Tooltip.Root>
												{:else if isMaintenanceRelease}
													<Tooltip.Root>
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
											title={releaseDate.getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 7
												? releaseDate.toLocaleDateString()
												: undefined}
											class="ml-auto mr-4 flex text-right text-sm text-muted-foreground xs:ml-0 xs:mr-2"
										>
											<span class="mr-1 hidden xs:block">•</span>
											{toRelativeDateString(releaseDate)}
										</span>
										<div class="hidden items-center gap-2 xs:flex">
											{#if isLatestRelease}
												<Tooltip.Root>
													<Tooltip.Trigger>
														<Badge
															class="bg-green-600 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-700"
														>
															Latest
														</Badge>
													</Tooltip.Trigger>
													<Tooltip.Content>
														This is the latest stable release of {repos[repo]}
													</Tooltip.Content>
												</Tooltip.Root>
											{/if}
											{#if isMajorRelease}
												<Tooltip.Root>
													<Tooltip.Trigger>
														<Badge>Major</Badge>
													</Tooltip.Trigger>
													<Tooltip.Content>
														Major update (e.g.: 1.0.0, 2.0.0, 3.0.0...)
													</Tooltip.Content>
												</Tooltip.Root>
											{:else if release.prerelease}
												<Tooltip.Root>
													<Tooltip.Trigger>
														<Badge variant="outline" class="border-primary text-primary">
															Prerelease
														</Badge>
													</Tooltip.Trigger>
													<Tooltip.Content>
														This version is a alpha or a beta, unstable version of {repos[repo]}
													</Tooltip.Content>
												</Tooltip.Root>
											{:else if isMaintenanceRelease}
												<Tooltip.Root>
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
								<Accordion.Content>
									<!-- Accordion content with markdown body and a link to open it on GitHub -->
									<div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-0">
										<div
											class="prose prose-sm dark:prose-invert prose-p:my-0 prose-a:no-underline prose-a:underline-offset-4 hover:prose-a:underline"
										>
											<!-- Markdown block using Marked.js under the hood, with custom renderers -->
											<!-- for clean look and using GitHub Flavored Markdown as an option -->
											<Markdown
												md={release.body ?? ""}
												plugins={[
													{
														renderer: {
															li: ListElementRenderer
														}
													},
													gfmPlugin()
												]}
											/>
										</div>
										<!-- Open the release on GitHub in a new tab, with a nice hover animation -->
										<Button
											href={release.html_url}
											target="_blank"
											class="group mb-4 ml-auto mr-8 sm:ml-0 sm:mt-auto"
										>
											Open release
											<ArrowUpRight
												class="ml-2 size-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
											/>
										</Button>
									</div>
								</Accordion.Content>
							</Accordion.Item>
						{/each}
					</Accordion.Root>
					<!-- Accordion footer linking to more (all) releases -->
					<span class="mt-8 flex justify-center">
						<em class="text-center text-sm text-muted-foreground">
							{data.length} results are shown. If you want to see more releases, please visit the
							<a
								href="https://github.com/sveltejs/{repo}/releases"
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
