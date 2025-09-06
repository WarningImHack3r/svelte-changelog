<script lang="ts">
	import "../app.css";
	import { scrollY } from "svelte/reactivity/window";
	import { dev } from "$app/environment";
	import { onNavigate } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { ChevronDown, type Icon, Monitor, Moon, Sun, X } from "@lucide/svelte";
	import { ProgressBar } from "@prgm/sveltekit-progress-bar";
	import { ModeWatcher, resetMode, setMode } from "mode-watcher";
	import { MetaTags, deepMerge } from "svelte-meta-tags";
	import { news } from "$lib/news/news.json";
	import type { Entries } from "$lib/types";
	import { cn } from "$lib/utils";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { Toaster } from "$lib/components/ui/sonner";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import ScreenSize from "$lib/components/ScreenSize.svelte";

	let { data, children } = $props();

	// View Transitions API
	// https://svelte.dev/blog/view-transitions
	onNavigate(({ complete }) => {
		if (!document.startViewTransition) return;

		return new Promise(resolve => {
			document.startViewTransition(async () => {
				resolve();
				await complete;
			});
		});
	});

	// SEO
	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));

	// Theme selector
	type Mode = Parameters<typeof setMode>[0];
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

	$effect(() => {
		// Theme
		theme =
			"mode-watcher-mode" in localStorage
				? localStorage["mode-watcher-mode"].replace(/"/g, "")
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
<ProgressBar class="text-primary" zIndex={100} />
<Toaster />
<MetaTags {...metaTags} />

<header
	class={[
		"sticky top-0 z-40 w-full bg-background/95 backdrop-blur transition-shadow duration-500 supports-backdrop-filter:bg-background/60",
		{
			"shadow-sm": newsToDisplay || (scrollY.current ?? 0) >= 25
		}
	]}
>
	<div
		class={[
			"border-b transition-colors duration-500",
			{
				"border-transparent": !newsToDisplay && (scrollY.current ?? 0) < 25
			}
		]}
	>
		<div class="mx-auto flex h-14 w-full items-center px-6 xs:px-8">
			<!-- Left part -->
			<a href={resolve("/")} class="flex items-center gap-2">
				<img
					src="https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg"
					alt="Svelte"
					class="size-8"
				/>
				{#if !page.route.id?.startsWith(resolve("/devlog"))}
					<span class="hidden text-xl font-semibold text-shadow-xs/10 xs:inline-block">
						<span class="font-display">Svelte</span>
						<span class="text-primary">Changelog</span>
					</span>
				{/if}
			</a>
			{#if page.route.id?.startsWith(resolve("/devlog"))}
				<div class="mx-4 h-8 w-0.5 rotate-25 rounded-full bg-muted-foreground/40"></div>
				<span class="text-xl font-semibold">Blog</span>
			{/if}

			<!-- Navigation -->
			{#if !page.route.id?.startsWith(resolve("/devlog"))}
				<ul class="ml-6 hidden sm:flex">
					{#each [{ link: resolve("/packages"), title: "Packages" }, { link: resolve("/tracker"), title: "Tracker" }, { link: resolve("/devlog"), title: "Devlog" }] as { link, title } (link)}
						{@const disabled = page.url.pathname.startsWith(link)}
						<li>
							<Button
								href={disabled ? undefined : link}
								variant="ghost"
								class="hover:bg-accent/75"
								{disabled}
							>
								{title}
							</Button>
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Right part -->
			<div class="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
				<nav class="flex items-center space-x-1">
					<Button
						href="https://github.com/WarningImHack3r/svelte-changelog"
						target="_blank"
						variant="ghost"
						size="icon"
					>
						<img src="/github.svg" alt="GitHub" class="size-5 dark:invert" />
						<span class="sr-only">Visit the repository</span>
					</Button>
					<DropdownMenu.Root bind:open={themeSwitcherOpen}>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon" class="w-14 gap-1">
									<div class="flex items-center">
										<Sun
											class="!size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
										/>
										<Moon
											class="absolute !size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
										/>
									</div>
									<ChevronDown
										class="size-4 opacity-50 transition-transform {themeSwitcherOpen
											? 'rotate-180'
											: ''}"
									/>
									<span class="sr-only">Change theme</span>
								</Button>
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
										onclick={() => {
											return mode === "system" ? resetMode() : setMode(mode);
										}}
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
				if (e.target.tagName.toLowerCase() === "a") {
					markCurrentNewsAsRead();
				}
			}}
		>
			<MarkdownRenderer
				markdown={newsToDisplay.content}
				inline
				class="mx-auto my-1 px-4 text-center text-foreground prose-a:font-semibold prose-a:text-foreground prose-a:underline"
			/>
			<Button
				variant="ghost"
				class="mr-4 h-auto rounded-none px-3 py-2 transition-transform hover:scale-110 hover:rotate-90 hover:bg-background/0"
				onclick={markCurrentNewsAsRead}
			>
				<X class="size-4" />
			</Button>
		</div>
	{/if}
</header>

<div class="container py-8">
	{@render children?.()}
</div>

<footer class="mt-auto w-full border-t bg-background">
	<div class="mx-auto flex h-12 w-full items-center px-8">
		<p class="text-sm text-muted-foreground">
			Built by <a
				href="https://github.com/WarningImHack3r"
				target="_blank"
				class={cn(
					buttonVariants({
						variant: "link"
					}),
					"h-auto p-0"
				)}
			>
				WarningImHack3r
			</a>.
		</p>
	</div>
</footer>
