<script lang="ts">
	import { type Component, untrack } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import Npm from "@icons-pack/svelte-simple-icons/icons/SiNpm";
	import { ChevronRight, Copy, Rss } from "@lucide/svelte";
	import posthog from "posthog-js";
	import { toast } from "svelte-sonner";
	import type { Package } from "$lib/server/package-discoverer";
	import { stringifyError } from "$lib/strings";
	import { Button } from "$lib/components/ui/button";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import { Separator } from "$lib/components/ui/separator";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import AnimatedCollapsibleContent from "$lib/components/AnimatedCollapsibleContent.svelte";

	type Props = {
		packageInfo: Package & {
			categorySlug?: string;
		};
		currentRepo: { owner: string; name: string };
		class?: ClassValue;
	};

	let { packageInfo, currentRepo, class: classValue }: Props = $props();

	let viewTransitionName = $derived(packageInfo.name.replace(/[@/-]/g, ""));
	let isCategory = $derived(
		// ugly logic but pretty efficient fwiw
		packageInfo.name.includes(" ") || packageInfo.name !== packageInfo.name.toLowerCase()
	);
	let rssRoutePackage = $derived(
		isCategory ? (packageInfo.categorySlug ?? packageInfo.name) : packageInfo.name
	);

	// Registries
	let registries = $derived<
		Record<
			string,
			({ iconUrl: string } | { icon: Component }) & { url: string; imgClasses?: string }
		>
	>(
		packageInfo.registryExcluded
			? Object.fromEntries([])
			: {
					npmjs: {
						icon: Npm,
						url: `https://npmjs.com/package/${packageInfo.name}`
					},
					npmx: {
						iconUrl: "https://npmx.dev/favicon.svg",
						url: `https://npmx.dev/package/${packageInfo.name}`,
						imgClasses: "dark:invert"
					}
				}
	);

	// Description check
	$effect(() => {
		if (packageInfo.description) return;
		posthog.captureException(new Error("Empty package description"), {
			package: untrack(() => packageInfo.name)
		});
	});

	// RSS
	const rssEntries: Record<string, string> = {
		XML: "rss.xml",
		ATOM: "atom.xml",
		JSON: "rss.json"
	};

	const trailingSlashRegex = /\/$/;
	/**
	 * Append a segment at the end of an URL, cleanly.
	 *
	 * @param origin the URL origin
	 * @param pathname the URL pathname
	 * @param segment the segment to add
	 * @returns the new URL with an added segment
	 */
	function appendToPath(origin: string, pathname: string, segment: string) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const u = new URL(pathname, origin);
		u.pathname = `${u.pathname.replace(trailingSlashRegex, "")}/${segment}`;
		return u.href;
	}
</script>

<svelte:head>
	{#each Object.entries(rssEntries) as [name, file] (name)}
		<link
			rel="alternate"
			type="application/{file.replace('.', '+')}"
			href={appendToPath(
				page.url.origin,
				resolve("/package/[...package]", {
					package: rssRoutePackage
				}),
				file
			)}
			title="RSS feed for {packageInfo.name}"
		/>
	{/each}
</svelte:head>

<div class={classValue}>
	<div class="group relative">
		<h1
			class="text-3xl font-semibold text-primary text-shadow-sm motion-safe:[view-transition-name:var(--vt-name)] md:text-5xl"
			style:--vt-name="title-{viewTransitionName}"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html packageInfo.name.replace(/\//g, "/<wbr />")}
		</h1>
		{#if !isCategory}
			<div
				class="absolute inset-s-0 top-2.5 hidden w-6 scale-75 opacity-0 transition-[translate,opacity,scale] group-hover:-translate-x-5 group-hover:scale-100 group-hover:opacity-100 xs:block 2xl:w-8 2xl:group-hover:-translate-x-8 md:top-4.5 md:group-hover:-translate-x-6"
			>
				<button
					type="button"
					onclick={() =>
						navigator.clipboard
							.writeText(packageInfo.name)
							.then(() =>
								toast.success("Package name copied", {
									description: `"${packageInfo.name}" has been successfully copied to your clipboard!`
								})
							)
							.catch(e =>
								toast.error("Failed to copy", {
									description: `Could not copy "${packageInfo.name}" to your clipboard: ${stringifyError(e)}"`
								})
							)}
				>
					<Copy class="size-4 text-muted-foreground hover:text-primary-foreground md:size-5" />
				</button>
			</div>
		{/if}
	</div>
	<div class="flex flex-col xs:flex-row xs:items-center">
		<!-- Repo name -->
		{#if currentRepo.owner && currentRepo.name}
			<h2 class="group text-xl text-muted-foreground text-shadow-sm/5">
				<a
					href="https://github.com/{currentRepo.owner}/{currentRepo.name}"
					target="_blank"
					class="underline-offset-2 group-hover:underline after:ml-0.5 after:inline-block after:font-sans after:text-sm after:content-['↗']"
				>
					<span
						class="motion-safe:[view-transition-name:var(--vt-name)]"
						style:--vt-name="owner-{viewTransitionName}"
					>
						{currentRepo.owner}
					</span>/<wbr /><span
						class="motion-safe:[view-transition-name:var(--vt-name)]"
						style:--vt-name="repo-name-{viewTransitionName}"
					>
						{currentRepo.name}
					</span>
				</a>
			</h2>
			<Separator
				orientation="vertical"
				class="mx-2 hidden bg-muted-foreground/50 data-[orientation=vertical]:h-lh xs:block"
			/>
		{/if}
		<!-- Sub-items -->
		<div class="inline-flex items-center">
			<!-- JS registries -->
			{#each Object.entries(registries) as [name, registry], index (name)}
				{@const { url: href, imgClasses } = registry}
				<Button variant="ghost" size="icon" class="size-7" {href} target="_blank">
					{#if "iconUrl" in registry}
						<img src={registry.iconUrl} alt={name} class={["h-4", imgClasses]} />
					{:else}
						<registry.icon class={registry.imgClasses} />
					{/if}
				</Button>

				<!-- Only shows if there are registries available for this package -->
				{#if index === Object.keys(registries).length - 1}
					<Separator
						orientation="vertical"
						class="mx-2 bg-muted-foreground/50 data-[orientation=vertical]:h-lh"
					/>
				{/if}
			{/each}
			<!-- RSS -->
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
					{#each Object.entries(rssEntries) as [name, file] (name)}
						<Button
							variant="link"
							size="sm"
							class="h-auto px-1 py-0 text-foreground"
							href={appendToPath(
								page.url.origin,
								resolve("/package/[...package]", {
									package: rssRoutePackage
								}),
								file
							)}
							data-sveltekit-preload-data="off"
							data-sveltekit-preload-code="off"
						>
							{name}
						</Button>
					{/each}
				</AnimatedCollapsibleContent>
			</Collapsible.Root>
		</div>
	</div>
	{#if packageInfo.description}
		<h3
			class="mt-4 italic motion-safe:[view-transition-name:var(--vt-name)]"
			style:--vt-name="desc-{viewTransitionName}"
		>
			{packageInfo.description}
		</h3>
	{/if}
</div>
