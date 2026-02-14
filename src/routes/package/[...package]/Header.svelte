<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { ChevronRight, Copy, Rss } from "@lucide/svelte";
	import { toast } from "svelte-sonner";
	import type { Package } from "$lib/server/package-discoverer";
	import { ALL_SLUG } from "$lib/types";
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

	// Registries
	let registries = $derived<Record<string, { iconUrl: string; url: string; imgClasses?: string }>>(
		packageInfo.categorySlug === ALL_SLUG || packageInfo.registryExcluded
			? Object.fromEntries([])
			: {
					npmjs: {
						iconUrl: "/npm.svg",
						url: `https://npmjs.com/package/${packageInfo.name}`,
						imgClasses:
							"filter-[grayscale(1)_contrast(100)_brightness(1)] dark:filter-[grayscale(1)_contrast(100)_brightness(1)_invert(1)]"
					},
					npmx: {
						iconUrl: "https://npmx.dev/logo.svg",
						url: `https://npmx.dev/package/${packageInfo.name}`,
						imgClasses: "scale-110 dark:invert"
					}
				}
	);

	// RSS
	const rssEntries: Record<string, string> = {
		XML: "rss.xml",
		ATOM: "atom.xml",
		JSON: "rss.json"
	};

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
		u.pathname = `${u.pathname.replace(/\/$/, "")}/${segment}`;
		return u.href;
	}
</script>

<div class={classValue}>
	<div class="group relative">
		<h1
			class="text-3xl font-semibold text-primary text-shadow-sm motion-safe:[view-transition-name:var(--vt-name)] md:text-5xl"
			style:--vt-name="title-{viewTransitionName}"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html packageInfo.name.replace(/\//g, "/<wbr />")}
		</h1>
		<div
			class="absolute start-0 top-2.5 hidden w-6 scale-75 opacity-0 transition-[translate,opacity,scale] group-hover:-translate-x-5 group-hover:scale-100 group-hover:opacity-100 xs:block 2xl:w-8 2xl:group-hover:-translate-x-8 md:top-4.5 md:group-hover:-translate-x-6"
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
								description: `Could not copy "${packageInfo.name}" to your clipboard: ${e}"`
							})
						)}
			>
				<Copy class="size-4 text-muted-foreground hover:text-primary-foreground md:size-5" />
			</button>
		</div>
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
			{#each Object.entries(registries) as [name, { iconUrl: src, url: href, imgClasses }], index (name)}
				<Button variant="ghost" size="icon" class="size-7" {href} target="_blank">
					<img {src} alt={name} class={["h-4", imgClasses]} />
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
									package: packageInfo.name
								}),
								file
							)}
							data-sveltekit-preload-data="tap"
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
