<script lang="ts">
	import "../app.css";
	import type { ComponentProps } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { scrollY } from "svelte/reactivity/window";
	import { dev } from "$app/environment";
	import { onNavigate } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page, updated } from "$app/state";
	import {
		ChevronDown,
		ChevronRight,
		House,
		type Icon,
		Menu,
		Monitor,
		Moon,
		Newspaper,
		Package,
		Radar,
		Snowflake,
		Sun,
		X
	} from "@lucide/svelte";
	import { ProgressBar } from "@prgm/sveltekit-progress-bar";
	import { ModeWatcher, resetMode, setMode } from "mode-watcher";
	import { PersistedState } from "runed";
	import { MetaTags, deepMerge } from "svelte-meta-tags";
	import { uniq } from "$lib/array";
	import { news } from "$lib/news/news.json";
	import { authorVCSProfile, authorVCSUsername, siteName, siteRepo } from "$lib/properties";
	import type { Entries } from "$lib/types";
	import { cn } from "$lib/utils";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { Separator } from "$lib/components/ui/separator";
	import * as Sheet from "$lib/components/ui/sheet";
	import { Toaster } from "$lib/components/ui/sonner";
	import { Toggle } from "$lib/components/ui/toggle";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import ScreenSize from "$lib/components/ScreenSize.svelte";
	import Snowflakes from "$lib/components/Snowflakes.svelte";
	import DesktopNavigation from "./DesktopNavigation.svelte";

	let { data, children } = $props();

	// View Transitions API
	// https://svelte.dev/blog/view-transitions
	onNavigate(({ complete }) => {
		if (!document.startViewTransition) return;

		return new Promise(resolve =>
			document.startViewTransition(async () => {
				resolve();
				await complete;
			})
		);
	});

	// SEO
	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));

	// Theme selector
	type Mode = Parameters<typeof setMode>[0]; // the Mode type isn't exported by mode-watcher
	type Theme = {
		label: string;
		icon: typeof Icon;
	};
	const themes: Record<Mode, Theme> = {
		light: {
			label: "Light",
			icon: Sun
		},
		dark: {
			label: "Dark",
			icon: Moon
		},
		system: {
			label: "System",
			icon: Monitor
		}
	};
	let theme = $state<keyof typeof themes>("system");
	let themeSwitcherOpen = $state(false);

	// News
	let newsToDisplay = $state<(typeof news)[number]>();
	const closedNewsKey = "closed-news";
	function getClosedNewsIds() {
		return JSON.parse(localStorage.getItem(closedNewsKey) ?? "[]") as (typeof news)[number]["id"][];
	}
	function markCurrentNewsAsRead() {
		if (!newsToDisplay) return;
		localStorage.setItem(closedNewsKey, JSON.stringify([...getClosedNewsIds(), newsToDisplay.id]));
		newsToDisplay = undefined;
	}

	// Navbar
	const navbarBorderThreshold = 25;
	let navbarItems = $derived<
		(NonNullable<ComponentProps<typeof DesktopNavigation>["items"]>[number] & {
			icon: typeof Icon;
		})[]
	>([
		{ name: "Home", icon: House, href: resolve("/") },
		{
			name: "Packages",
			icon: Package,
			dropdownItems: uniq(
				data.displayablePackages.flatMap(({ packages }) => packages.map(({ pkg }) => pkg.name)),
				name => name
			)
				.toSorted((a, b) => a.localeCompare(b))
				.map(pkgName => ({
					title: pkgName,
					href: resolve("/package/[...package]", { package: pkgName })
				}))
				.slice(0, 3 * 3 - 1),
			moreHref: resolve("/packages")
		},
		{
			name: "Tracker",
			icon: Radar,
			dropdownItems: uniq(
				data.displayablePackages.flatMap(({ packages }) =>
					packages.map(({ repoOwner, repoName }) => ({ owner: repoOwner, name: repoName }))
				),
				({ owner, name }) => `${owner}/${name}`
			)
				.map(({ owner, name }) => ({
					title: `${owner}/${name}`,
					href: resolve("/tracker/[org]/[repo]", { org: owner, repo: name })
				}))
				.slice(0, 3 * 5 - 1),
			moreHref: resolve("/tracker")
		},
		{ name: "Devlog", icon: Newspaper, href: resolve("/devlog") }
	]);
	onNavigate(({ from, to, type }) => {
		if (from?.route.id === to?.route.id || type === "form") return;
		open = false;
	});

	let open = $state(false);

	// Snow - enabled during Dec 15th through Jan 15th
	const currentDate = new Date();
	let beginningDate = $derived(
		new Date(currentDate.getFullYear() + (currentDate.getMonth() === 0 ? -1 : 0), 11, 15)
	);
	let endingDate = $derived(
		new Date(currentDate.getFullYear() + (currentDate.getMonth() === 0 ? 0 : 1), 0, 15)
	);
	let isSnowTime = $derived(currentDate >= beginningDate && currentDate <= endingDate);
	let isSnowEnabled = new PersistedState("snowlover", true);
	let reduceMotion = new MediaQuery("prefers-reduced-motion: reduce");

	$effect(() => {
		// Theme
		theme =
			"mode-watcher-mode" in localStorage
				? localStorage["mode-watcher-mode"].replaceAll('"', "")
				: "system";

		// Legacy news key
		const oldLsNewsKey = "closedNews";
		const oldLsNewsValue = localStorage.getItem(oldLsNewsKey);
		if (oldLsNewsValue) {
			localStorage.setItem(closedNewsKey, oldLsNewsValue);
			localStorage.removeItem(oldLsNewsKey);
		}

		// News
		const closedNews = getClosedNewsIds();
		const now = new Date();
		newsToDisplay = news.find(
			({ id, content, endDate }) => !closedNews.includes(id) && new Date(endDate) > now && content
		);
	});
</script>

{#if dev}
	<ScreenSize />
{/if}
<ModeWatcher />
{#if isSnowTime}
	<Snowflakes
		enabled={isSnowEnabled.current && !reduceMotion.current}
		class="pointer-events-none fixed inset-0 -z-10 h-screen w-screen"
	/>
{/if}
<ProgressBar class="text-primary" zIndex={100} />
<Toaster duration={5_000} />
<MetaTags {...metaTags} />

<header
	class={[
		"sticky top-0 z-40 w-full transition-shadow duration-500",
		{
			"bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60":
				newsToDisplay || (scrollY.current ?? 0) >= navbarBorderThreshold
		}
	]}
>
	<div
		class={[
			"border-b transition-colors duration-500",
			{
				"border-transparent": !newsToDisplay && (scrollY.current ?? 0) < navbarBorderThreshold
			}
		]}
	>
		<div class="mx-auto flex h-14 w-full items-center px-6 xs:px-8">
			<!-- Left part -->
			<Sheet.Root bind:open>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<AnimatedButton {...props} variant="ghost" class="-ms-3 md:hidden">
							<Menu />
							<span class="sr-only">Site menu</span>
						</AnimatedButton>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content side="left" class="overflow-y-auto">
					<Sheet.Header>
						<Sheet.Title class="text-xl">{siteName}</Sheet.Title>
					</Sheet.Header>
					<ul class="flex flex-col gap-1 px-2">
						{#each navbarItems as item (item.name)}
							{@const link = "href" in item ? item.href : (item.moreHref ?? "/")}
							{@const disabled = page.url.pathname.startsWith(link === "/" ? "/package/" : link)}
							<li
								class="inline-flex items-center gap-3 rounded-md px-2 has-disabled:bg-accent has-disabled:opacity-50"
							>
								<item.icon class="size-4 shrink-0 text-primary" />
								<Button
									href={disabled ? undefined : link}
									variant="link"
									{disabled}
									class="grow justify-start py-0 text-foreground has-[>svg]:px-0"
								>
									{item.name}
									<ChevronRight class="ml-auto size-4 shrink-0 in-disabled:hidden" />
								</Button>
							</li>
						{/each}
					</ul>
				</Sheet.Content>
			</Sheet.Root>
			<a href={resolve("/")} class="flex items-center gap-2">
				<img
					src="https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg"
					alt="Svelte"
					class="size-8"
				/>
				{#if !page.route.id?.startsWith(resolve("/devlog"))}
					{@const [first = "huh?", second] = siteName.split(" ", 2)}
					<span class="hidden gap-1 text-xl font-semibold text-shadow-xs/10 xs:inline-flex">
						<span style:text-box="trim-both ex alphabetic" class="font-display">{first}</span>
						{#if second}
							<span style:text-box="trim-both ex alphabetic" class="text-[1.3rem] text-primary">
								{second}
							</span>
						{/if}
					</span>
				{/if}
			</a>
			{#if page.route.id?.startsWith(resolve("/devlog"))}
				<div class="mx-4 h-8 w-0.5 rotate-25 rounded-full bg-muted-foreground/40"></div>
				<span class="text-xl font-semibold">Devlog</span>
			{:else}
				<!-- Navigation -->
				<DesktopNavigation
					items={navbarItems.filter(({ name }) => name !== "Home")}
					class="ms-6 hidden md:flex"
				/>
			{/if}

			<!-- Right part -->
			<div class="flex flex-1 items-center justify-end gap-2 sm:gap-4">
				<nav class="flex items-center gap-1">
					{#if isSnowTime}
						<Tooltip.Provider disabled={!reduceMotion.current}>
							<Tooltip.Root delayDuration={300}>
								<Tooltip.Trigger>
									{#snippet child({ props })}
										<Toggle
											{...props}
											aria-label="Toggle snowflakes"
											variant="outline"
											bind:pressed={isSnowEnabled.current}
											disabled={reduceMotion.current}
											class="me-1 disabled:pointer-events-auto"
										>
											<Snowflake />
										</Toggle>
										<Separator orientation="vertical" class="data-[orientation=vertical]:h-lh" />
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content
									class="border bg-popover text-popover-foreground"
									arrowClasses="bg-popover border-b border-r"
								>
									You can't control the snow as you prefer reduced motion. As a result, snow is
									disabled.
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/if}
					<AnimatedButton href={siteRepo} target="_blank" variant="ghost" size="icon">
						<img src="/github.svg" alt="GitHub" class="size-5 dark:invert" />
						<span class="sr-only">Visit the repository</span>
					</AnimatedButton>
					<DropdownMenu.Root bind:open={themeSwitcherOpen}>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<AnimatedButton {...props} variant="ghost" size="icon" class="w-14 gap-1">
									<div class="flex items-center">
										<Sun
											class="size-5! scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
										/>
										<Moon
											class="absolute size-5! scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
										/>
									</div>
									<ChevronDown
										class="size-4 opacity-50 transition-transform {themeSwitcherOpen
											? 'rotate-180'
											: ''}"
									/>
									<span class="sr-only">Change theme</span>
								</AnimatedButton>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Label>Theme</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.RadioGroup bind:value={theme}>
								{#each Object.entries(themes) as Entries<typeof themes> as [mode, availableTheme] (mode)}
									<DropdownMenu.RadioItem
										class="cursor-pointer data-disabled:opacity-75"
										value={mode}
										disabled={theme === mode}
										onclick={() => (mode === "system" ? resetMode() : setMode(mode))}
									>
										<availableTheme.icon class="mr-2 size-4" />
										<span>{availableTheme.label}</span>
									</DropdownMenu.RadioItem>
								{/each}
							</DropdownMenu.RadioGroup>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</nav>
			</div>
		</div>
	</div>
	{#if newsToDisplay}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			role="banner"
			class="flex items-center bg-primary/90"
			onclick={e => {
				// Event bubbling from children of MarkdownRenderer
				if (!e.target || !(e.target instanceof HTMLAnchorElement)) return;
				markCurrentNewsAsRead();
			}}
		>
			<MarkdownRenderer
				markdown={newsToDisplay.content}
				inline
				class="mx-auto my-1 max-w-3/4 px-4 text-center text-foreground prose-a:font-semibold prose-a:text-foreground prose-a:underline"
			/>
			<AnimatedButton
				variant="ghost"
				class="mr-4 h-auto rounded-none px-3 py-2 transition-transform hover:scale-110 hover:rotate-90 hover:bg-accent/0 dark:hover:bg-accent/0"
				onclick={markCurrentNewsAsRead}
			>
				<X class="size-4" />
			</AnimatedButton>
		</div>
	{/if}
</header>

<main data-sveltekit-reload={updated.current ? "" : "off"} class="container py-8">
	{@render children?.()}
</main>

<footer class="mt-auto w-full border-t bg-background">
	<div class="mx-auto flex h-12 w-full items-center px-8">
		<p class="text-sm text-muted-foreground">
			Built by <a
				href={authorVCSProfile}
				target="_blank"
				rel="external"
				class={cn(
					buttonVariants({
						variant: "link"
					}),
					"h-auto p-0"
				)}
			>
				{authorVCSUsername}
			</a>.
		</p>
	</div>
</footer>
