<script lang="ts">
	import "../app.css";
	import type { ComponentProps } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { scrollY } from "svelte/reactivity/window";
	import { dev } from "$app/env";
	import { beforeNavigate, onNavigate } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page, updated } from "$app/state";
	import GitHub from "@icons-pack/svelte-simple-icons/icons/SiGithub";
	import {
		ChevronDown,
		ChevronRight,
		House,
		type Icon,
		Lightbulb,
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
	import {
		ModeWatcher,
		resetMode as mwResetMode,
		setMode as mwSetMode,
		systemPrefersMode,
		toggleMode as mwToggleMode,
		userPrefersMode
	} from "mode-watcher";
	import { activeElement, PersistedState, PressedKeys } from "runed";
	import { MetaTags, deepMerge } from "svelte-meta-tags";
	import { news } from "$lib/news/news.json";
	import { authorVCSProfile, authorVCSUsername, siteName, siteRepo } from "$lib/properties";
	import type { Entries } from "$lib/types";
	import { cn } from "$lib/utils";
	import * as Alert from "$lib/components/ui/alert";
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
	import { waitFor } from "$lib/reactivity.svelte";
	import { local } from "$lib/storage";
	import DesktopNavigation from "./DesktopNavigation.svelte";

	let { data, children } = $props();

	/*
	 * Prevent server desync in a forced way (more strictly than by default) and related hooks errors
	 * Snippet from https://svelte.dev/docs/kit/configuration#version
	 */
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});

	/*
	 * View Transitions API
	 * https://svelte.dev/blog/view-transitions
	 */
	onNavigate(({ complete }) => {
		if (!document.startViewTransition) return;

		return new Promise(resolve =>
			document.startViewTransition(async () => {
				try {
					resolve();
					await complete;
				} catch {
					// sad :(
				}
			})
		);
	});
	function withViewTransition(callback: () => void, ...types: string[]) {
		if (!document.startViewTransition) {
			callback();
			return;
		}
		try {
			document.startViewTransition({ update: callback, types });
		} catch {
			// Level 1 browsers don't support the options-object form
			document.startViewTransition(callback);
		}
	}
	function setMode(mode: Mode) {
		withViewTransition(() => mwSetMode(mode), "theme");
	}
	function resetMode() {
		withViewTransition(mwResetMode, "theme");
	}
	function toggleMode() {
		withViewTransition(mwToggleMode, "theme");
	}

	// SEO
	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));

	// Theme selector
	type Mode = Parameters<typeof mwSetMode>[0]; // mode-watcher doesn't export the Mode type
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
	let theme = $derived<keyof typeof themes>(userPrefersMode.current ?? "system");
	let themeSwitcherOpen = $state(false);
	let themeSwitcherFullyClosed = $state(false);
	// change theme on pressing "d"
	const themeSwitchKey = "d";
	new PressedKeys().onKeys(themeSwitchKey, () => {
		const element = activeElement.current;
		// avoid impacting interactive elements
		if (
			element?.matches(
				"input:not([type=hidden],[type=submit],[type=button],[type=reset],[type=image]), textarea, select, [contenteditable]"
			)
		)
			return;

		// instead of doing system -> light -> dark -> light -> dark, reset to system if it matches the target mode
		const userMode = userPrefersMode.current ?? "system";
		const systemMode = systemPrefersMode.current;
		if (userMode !== "system" && systemMode && systemMode !== userMode) resetMode();
		else toggleMode();
	});

	// News
	let newsToDisplay = $state<(typeof news)[number]>();
	const closedNewsKey = "closed-news";
	function getClosedNewsIds() {
		return JSON.parse(local.getItem(closedNewsKey) ?? "[]") as (typeof news)[number]["id"][];
	}
	function markCurrentNewsAsRead() {
		if (!newsToDisplay) return;
		local.setItem(closedNewsKey, JSON.stringify([...getClosedNewsIds(), newsToDisplay.id]));
		newsToDisplay = undefined;
	}

	// Navbar
	const navbarBorderThreshold = 25;
	const navbarItems: (NonNullable<ComponentProps<typeof DesktopNavigation>["items"]>[number] & {
		icon: typeof Icon;
	})[] = [
		{ name: "Home", icon: House, href: resolve("/") },
		{
			name: "Packages",
			icon: Package,
			href: resolve("/packages")
		},
		{
			name: "Tracker",
			icon: Radar,
			href: resolve("/tracker")
		},
		{ name: "Devlog", icon: Newspaper, href: resolve("/devlog") }
	];
	let isPageDevlog = $derived(page.route.id?.startsWith(resolve("/devlog")) ?? false);
	onNavigate(({ from, to, type }) => {
		if (from?.route.id === to?.route.id || type === "form") return;
		open = false;
	});

	let open = $state(false);

	// Pro tips
	const proTips = [
		"You can prefix GitHub URLs of issues, PRs or discussions with `svcl.dev/` to view them on this page! Also try it on a GitHub release URL ;)",
		"A hidden `/package/all` endpoint exists, listing all the releases for all the packages! It's messy & resource-heavy, hence why it's not listed, but it's there if you need it :D",
		"You can suffix a package page with the `#X.Y.Z` hash corresponding to any version you want to highlight: browsing this link will scroll to this release and highlight it!",
		"You can use the `?reset=X` query parameter on a package page to reset your last visit date for a given package to any date! Use it with any duration in the form of `1d4h3m` to get a preview of what it would do!",
		`In addition to the theme selector, you can press <kbd>${themeSwitchKey}</kbd> for a quick and smart theme switch!`
	];

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
		// Legacy news key
		const oldLsNewsKey = "closedNews";
		const oldLsNewsValue = local.getItem(oldLsNewsKey);
		if (oldLsNewsValue) {
			local.setItem(closedNewsKey, oldLsNewsValue);
			local.removeItem(oldLsNewsKey);
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
		"sticky top-0 z-40 w-full transition-shadow duration-500 motion-safe:[view-transition-name:var(--vt-name)]",
		{
			"bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60":
				!!newsToDisplay || (scrollY.current ?? 0) >= navbarBorderThreshold
		}
	]}
	style:--vt-name="global-site-navbar"
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
							{const link = item.href}
							{const disabled = page.url.pathname.startsWith(link === "/" ? "/package/" : link)}
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
				{#if !isPageDevlog}
					{const [first = "huh?", second] = siteName.split(" ", 2)}
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
			{#if isPageDevlog}
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
						<GitHub title="GitHub" class="size-5" />
						<span class="sr-only">Visit the repository</span>
					</AnimatedButton>
					<DropdownMenu.Root
						bind:open={themeSwitcherOpen}
						// onOpenChangeComplete is not triggered on dropdown open, I need this other callback too
						onOpenChange={() => (themeSwitcherFullyClosed = false)}
						onOpenChangeComplete={changed => (themeSwitcherFullyClosed = changed === false)}
					>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<AnimatedButton {...props} variant="ghost" size="icon" class="w-14 gap-1">
									<div class="flex items-center">
										<Sun class="size-5! transition-transform dark:scale-0" />
										<Moon class="absolute size-5! scale-0 transition-transform dark:scale-100" />
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
										onclick={() =>
											waitFor(() => themeSwitcherFullyClosed, true).then(() => {
												if (mode === "system") resetMode();
												else setMode(mode);
											})}
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

<main class="container py-8">
	{@render children?.()}
</main>

<!-- Pro tips -->
{#if proTips.length && !isPageDevlog && !page.error}
	{const proTip = proTips[Math.floor(Math.random() * proTips.length)]}
	{#if proTip}
		<div class="container">
			{#key proTip}
				<Alert.Root
					class="group mx-auto my-8 w-fit bg-background opacity-60 transition-[opacity,background-color] duration-150 hover:bg-muted/30 hover:opacity-100"
				>
					<Lightbulb class="transition-colors duration-300 group-hover:text-amber-500" />
					<Alert.Title>Pro tip</Alert.Title>
					<Alert.Description>
						<MarkdownRenderer
							markdown={proTip}
							parseRawHtml
							inline
							class="prose-sm max-w-[100ch] text-pretty"
						/>
					</Alert.Description>
				</Alert.Root>
			{/key}
		</div>
	{/if}
{/if}

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

<style>
	:global {
		html:active-view-transition-type(theme) {
			&::view-transition-group(root) {
				animation-duration: 500ms;
			}
		}
	}
</style>
