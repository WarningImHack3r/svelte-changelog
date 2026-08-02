<script lang="ts">
	import { untrack } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { scrollY } from "svelte/reactivity/window";
	import { onNavigate } from "$app/navigation";
	import { navigating, page } from "$app/state";
	import { LoaderCircle, Menu } from "@lucide/svelte";
	import { getMinor, getPatch } from "verkit";
	import * as Sheet from "$lib/components/ui/sheet";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import { local } from "$lib/storage";
	import { getPackageSettings } from "../settings.svelte";
	import type { Snapshot } from "./$types";
	import Header from "./Header.svelte";
	import ResetDialog from "./ResetDialog.svelte";
	import { getRouteReleases } from "./releases.remote";
	import { computeSearchParams } from "./search-params";
	import Releases from "./Releases.svelte";
	import SidePanel from "./SidePanel.svelte";
	import { getAllReleases } from "../../all-releases.remote";
	import { getDisplayablePackages } from "../../packages.remote";

	const { resetDate } = computeSearchParams(page.url);
	const { currentPackage, releases } = await getRouteReleases(page.params.package);

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

	const sharedSettings = getPackageSettings();
	let packageSettings = $derived(sharedSettings.get(currentPackage.pkg.name));

	let lastUpdateDate = $state<Date>();
	$effect(() => {
		const lastVisit = local.getItem(`last-visited-${currentPackage.pkg.name.replace(" ", "-")}`);
		if (lastVisit) lastUpdateDate = new Date(lastVisit);
		local.setItem(
			`last-visited-${currentPackage.pkg.name.replace(" ", "-")}`,
			new Date().toISOString()
		);
	});

	let displayableReleases = $derived(
		releases.filter(({ prerelease, cleanVersion }) => {
			const baseCondition = prerelease ? packageSettings.current.showPrereleases : true;
			switch (packageSettings.current.releasesType) {
				case "all":
					return baseCondition;
				case "major":
					return baseCondition && getMinor(cleanVersion) === 0 && getPatch(cleanVersion) === 0;
				case "minor":
					return baseCondition && getMinor(cleanVersion) > 0 && getPatch(cleanVersion) === 0;
				case "patch":
					return baseCondition && getPatch(cleanVersion) > 0;
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
						if (page.url.hash && tag_name.includes(page.url.hash.replace("#", ""))) return true;
						if (displayableReleases.length <= 5) {
							const lastSeenDate = lastUpdateDate;
							if (!lastSeenDate) return false;
							return displayableReleases.every(
								({ created_at, published_at }) =>
									new Date(published_at ?? created_at) <= lastSeenDate
							);
						}
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

		setTimeout(() => {
			document.getElementById(page.url.hash.replace("#", ""))?.scrollIntoView({
				behavior: untrack(() => wantsReducedMotion.current) ? undefined : "smooth"
			});
		}, 300); // wait for the accordions to expand (+ better UX)
	});

	// Side panel
	let open = $state(false);
	onNavigate(({ from, to, type }) => {
		if (from?.route.id !== to?.route.id || type === "form") return;
		open = false;
	});

	export const snapshot: Snapshot<typeof expandableReleases> = {
		capture: () => expandableReleases,
		restore: item => (expandableReleases = item)
	};
</script>

<ResetDialog currentPackage={currentPackage.pkg.name} {resetDate} />

<svelte:boundary>
	{#snippet pending()}
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

	<div class="flex flex-col">
		<div class="flex items-center justify-between gap-8">
			<Header
				packageInfo={{
					...currentPackage.pkg,
					categorySlug: currentPackage.category.slug
				}}
				currentRepo={{
					owner: currentPackage.repoOwner,
					name: currentPackage.repoName
				}}
				class="my-8 *:w-fit *:max-w-5/6"
			/>

			<Sheet.Root bind:open>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<AnimatedButton {...props} variant="secondary" class="lg:hidden">
							<Menu />
							<span class="sr-only">Packages list menu</span>
						</AnimatedButton>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="overflow-y-auto">
					<Sheet.Header>
						<Sheet.Title>Packages</Sheet.Title>
					</Sheet.Header>
					<SidePanel
						headless
						packageName={currentPackage.pkg.name}
						allPackages={await getDisplayablePackages()}
						otherReleases={await getAllReleases()}
						bind:settings={packageSettings.current}
					/>
				</Sheet.Content>
			</Sheet.Root>
		</div>
		<div class="flex gap-8">
			<Releases bind:expandable={expandableReleases} displayable={displayableReleases} />

			<svelte:boundary>
				{#snippet pending()}
					<Skeleton class="hidden h-96 w-140 lg:block" />
				{/snippet}

				<SidePanel
					packageName={currentPackage.pkg.name}
					allPackages={await getDisplayablePackages()}
					otherReleases={await getAllReleases()}
					class="hidden h-fit w-100 shrink-0 lg:flex"
					bind:settings={packageSettings.current}
				/>
			</svelte:boundary>
		</div>
	</div>
</svelte:boundary>
