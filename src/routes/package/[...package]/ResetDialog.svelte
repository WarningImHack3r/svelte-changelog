<script lang="ts" module>
	const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short"
	});

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium"
	});

	const dayFormatter = new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "short"
	});

	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		timeStyle: "short"
	});

	const listFormatter = new Intl.ListFormat("en-US");
</script>

<script lang="ts">
	import { pushState } from "$app/navigation";
	import { page } from "$app/state";
	import type { GitHubRelease } from "$lib/server/github-api";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Label } from "$lib/components/ui/label";

	type Props = {
		currentPackage: string;
		resetDate: Date | undefined;
		allPackageReleases: Record<
			string,
			Promise<
				{ releases: ({ cleanName: string; cleanVersion: string } & GitHubRelease)[] } | undefined
			>
		>;
	};

	let { currentPackage, resetDate, allPackageReleases }: Props = $props();
	let id = $props.id();

	const currentDate = new Date();

	let notFullySeenPackages = $state<string[]>([]);
	let donePackages = $state(0);

	let strictReset = $state(false);
	let applyAll = $state(false);
	let targetDate = $derived.by(() => {
		if (!resetDate) return undefined;
		const target = resetDate;
		target.setHours(
			// not exactly accurate if the user spent a bunch of time looking at the dialog, but this applies exactly what's written in it
			strictReset ? currentDate.getHours() : 0,
			strictReset ? currentDate.getMinutes() : 0,
			strictReset ? currentDate.getSeconds() : 0,
			strictReset ? currentDate.getMilliseconds() : 0
		);
		return target;
	});
	let hasHourReset = $derived(resetDate && currentDate.getHours() !== resetDate.getHours());
	let hasNotFullySeens = $derived(notFullySeenPackages.length > 0 && applyAll);
	let isDoneScanning = $derived(donePackages >= Object.keys(allPackageReleases).length); // > should hopefully not happen, but just in case
	$effect(() => {
		if (!targetDate) return;
		donePackages = 0;
		notFullySeenPackages.length = 0;

		for (const [pkgName, releases] of Object.entries(allPackageReleases)) {
			releases
				.then(r => {
					if (r) {
						const lastVisitedItem = localStorage.getItem(`last-visited-${pkgName}`);
						if (lastVisitedItem) {
							const lastVisitedDate = new Date(lastVisitedItem);
							// will nuke visits if lastVisitedDate < resetDate (targetDate) && releases between them
							const willNukeUnseen =
								lastVisitedDate < targetDate &&
								r.releases.some(({ created_at, published_at }) => {
									const releaseDate = new Date(published_at ?? created_at);
									return releaseDate > lastVisitedDate && releaseDate < targetDate;
								});
							if (willNukeUnseen) notFullySeenPackages.push(pkgName);
						}
					}
					donePackages++;
				})
				.catch(() => donePackages++);
		}
	});

	/**
	 * Actually applies the visit time reset from the selected options and values
	 */
	function reset() {
		if (!targetDate) return;

		for (const pkgName of Object.keys(allPackageReleases)) {
			if (
				!applyAll &&
				pkgName.localeCompare(currentPackage, undefined, { sensitivity: "base" }) !== 0
			)
				continue;
			const item = localStorage.getItem(`last-visited-${pkgName}`);
			if (item) localStorage.setItem(`last-visited-${pkgName}`, targetDate.toISOString());
		}

		// refresh the page with the removed query param
		const newUrl = page.url;
		newUrl.searchParams.delete("reset");
		location.href = newUrl.toString(); // could've been an invalidate() + pushState, but I like this UX better for now
	}

	/**
	 * Removes the query parameter from the page
	 */
	function clearParams() {
		page.url.searchParams.delete("reset");
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		pushState(page.url, page.state);
	}
</script>

<Dialog.Root open={!!resetDate && isDoneScanning}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Date reset</Dialog.Title>
			<Dialog.Description class="space-y-2">
				<span class="block">
					You've used the <pre class="inline-block">reset</pre>
					query parameter. Do you really want to reset your last visit time for
					<strong>
						{applyAll ? "all visited" : "this"}
					</strong>
					package{applyAll ? "s" : ""} to
					<strong>{(hasHourReset ? dateTimeFormatter : dateFormatter).format(resetDate)}</strong>?
				</span>
				{#if hasNotFullySeens}
					{@const haz = notFullySeenPackages.length > 1 ? "have" : "has"}
					<span class="block text-yellow-500">
						{listFormatter.format(notFullySeenPackages)}
						{haz} <strong>releases you didn't see yet</strong> and that
						<strong>would be collapsed with this reset</strong>, increasing chances you miss them.
					</span>
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<!-- no need to check for other units, are they're either not configurable or not relevant -->
		{#if !hasHourReset}
			<div class="flex items-start gap-3">
				<Checkbox id="strict-{id}" bind:checked={strictReset} />
				<div class="grid">
					<Label for="strict-{id}" class="-mt-0.75 leading-normal">
						Reset using the current time
					</Label>
					<p class="text-sm text-muted-foreground">
						Will reset to {dayFormatter.format(resetDate)} at {timeFormatter.format(currentDate)} instead
						of {dayFormatter.format(resetDate)} at
						{timeFormatter.format(new Date(0, 0, 0, 0, 0, 0, 0))}
					</p>
				</div>
			</div>
		{/if}
		<div class="flex items-start gap-3">
			<Checkbox id="all-{id}" bind:checked={applyAll} />
			<div class="grid">
				<Label for="all-{id}" class="-mt-0.75 leading-normal">Apply to all the packages</Label>
				<p class="text-sm text-muted-foreground">
					Reset all the visited packages instead of just {currentPackage}
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })} onclick={clearParams}>
				Cancel
			</Dialog.Close>
			<Button variant="destructive" onclick={reset}>
				Reset{hasNotFullySeens ? " anyway" : ""}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
