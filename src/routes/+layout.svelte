<script lang="ts">
	import "../app.pcss";
	import { onMount, type SvelteComponent } from "svelte";
	import type { SvelteHTMLElements } from "svelte/elements";
	import { get } from "svelte/store";
	import { fade } from "svelte/transition";
	import { dev } from "$app/environment";
	import { invalidateAll } from "$app/navigation";
	import { page } from "$app/stores";
	import { ModeWatcher, resetMode, setMode } from "mode-watcher";
	import { ChevronDown, Monitor, Moon, Settings, Sun, X } from "lucide-svelte";
	import { Octokit } from "octokit";
	import { getSettings, getTabState, initSettings, initTabState } from "$lib/stores";
	import { cn } from "$lib/utils";
	import ScreenSize from "$lib/ScreenSize.svelte";
	import { buttonVariants, Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { news } from "$lib/news/news.json";
	import { getDataFromSettings } from "$lib/data";
	import type { Prettify } from "../types";

	// State
	initTabState();
	initSettings();
	const tabState = getTabState();
	const settings = getSettings();

	export let data;
	$: ({ repos } = getDataFromSettings(data, get(settings)));

	let scrollY = 0;

	// Types
	type Entries<T> = {
		[K in keyof T]: [K, T[K]];
	}[keyof T][];

	function typedEntries<T extends object>(obj: T) {
		return Object.entries(obj) as Entries<T>;
	}

	// Settings
	let settingsOpen = false;
	let ghTokenField = "";
	const unauthenticatedOctokit = new Octokit();
	const requiredScopes = ["public_repo"];
	let currentTokenScopes: string[] = [];
	let isTokenValid = false;
	let userInfo: Prettify<
		| Pick<
				Awaited<ReturnType<InstanceType<typeof Octokit>["rest"]["users"]["getAuthenticated"]>>,
				"data" | "headers"
		  >
		| undefined
	>;
	$: currentTokenScopes = userInfo?.headers["x-oauth-scopes"]?.split(",").map(s => s.trim()) || [];
	$: isTokenValid = requiredScopes.every(scope => currentTokenScopes.includes(scope));
	let userInfoError: Error | undefined;

	// Theme selector
	type Theme = {
		value: typeof theme;
		label: string;
		icon: typeof SvelteComponent<SvelteHTMLElements["svg"]>;
	};
	const themes: Theme[] = [
		{
			value: "light",
			label: "Light",
			icon: Sun
		},
		{
			value: "dark",
			label: "Dark",
			icon: Moon
		},
		{
			value: "system",
			label: "System",
			icon: Monitor
		}
	];
	let theme: "light" | "dark" | "system";
	let themeSwitcherOpen = false;

	// News
	let newsToDisplay: (typeof news)[number] | undefined;
	const closedNewsKey = "closedNews";
	function getClosedNewsIds() {
		return JSON.parse(localStorage.getItem(closedNewsKey) ?? "[]") as (typeof news)[number]["id"][];
	}

	onMount(() => {
		// Settings
		ghTokenField = $settings.githubToken ?? "";
		if (ghTokenField) {
			unauthenticatedOctokit.rest.users
				.getAuthenticated({
					headers: {
						authorization: `Bearer ${ghTokenField}`
					}
				})
				.then(({ data, headers }) => (userInfo = { data, headers }))
				.catch(error => (userInfoError = error));
		}

		// Theme
		theme =
			"mode-watcher-mode" in localStorage
				? localStorage["mode-watcher-mode"].replace(/"/g, "")
				: "system";

		// News
		const closedNews = getClosedNewsIds();
		const now = new Date();
		newsToDisplay = news.find(
			({ id, endDate }) => !closedNews.includes(id) && new Date(endDate) > now
		);
	});
</script>

{#if dev}
	<ScreenSize />
{/if}
<ModeWatcher />
<header
	class="sticky top-0 z-40 w-full bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="border-b">
		<div class="mx-auto flex h-14 w-full items-center px-8">
			<!-- Left part -->
			<a href="/" class="flex items-center gap-2">
				<img src="https://svelte.dev/favicon.png" alt="Svelte" class="size-8" />
				<h2 class="hidden text-xl font-semibold xs:inline-block">
					Svelte
					<span class="text-primary">Changelog</span>
				</h2>
			</a>

			<!-- Navigation -->
			<!-- TODO: don't hardcode scrollY? -->
			{#if scrollY > 150 && $page.route.id === "/"}
				<ul transition:fade={{ duration: 200 }} class="ml-6 hidden sm:block">
					<li>
						{#each typedEntries(repos) as [id, { name }]}
							<Button variant="ghost" on:click={() => tabState.set(id)}>
								{name}
							</Button>
						{/each}
					</li>
				</ul>
			{/if}

			<!-- Right part -->
			<div class="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
				<nav class="flex items-center space-x-1">
					<Dialog.Root bind:open={settingsOpen}>
						<Dialog.Trigger class={cn(buttonVariants({ variant: "ghost" }), "aspect-square p-0")}>
							<Settings class="size-5" />
							<span class="sr-only">Settings</span>
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header class="mb-2">
								<Dialog.Title>Settings</Dialog.Title>
								<Dialog.Description>This is where you make your changes.</Dialog.Description>
							</Dialog.Header>
							<!-- Settings to input GH API key (stored in localStorage) -->
							<div class="grid w-full max-w-sm items-center gap-1.5">
								<Label for="token-label">GitHub token</Label>
								{#if dev}
									<span class="text-sm text-red-500">Dev mode enabled, input token not used</span>
								{/if}
								<Input
									type="token"
									id="token-label"
									placeholder="ghp_xxxxxxxxxx"
									bind:value={ghTokenField}
									on:input={() => {
										userInfoError = undefined;
										if (!ghTokenField) {
											userInfo = undefined;
											return;
										}
										setTimeout(() => {
											userInfoError = undefined;
											if (!ghTokenField) {
												userInfo = undefined;
												return;
											}
											unauthenticatedOctokit.rest.users
												.getAuthenticated({
													headers: {
														authorization: `Bearer ${ghTokenField}`
													}
												})
												.then(({ data, headers }) => (userInfo = { data, headers }))
												.catch(error => (userInfoError = error));
										}, 100);
									}}
								/>
								{#if userInfoError}
									<p class="text-sm text-red-500">{userInfoError.message}</p>
								{:else if userInfo}
									{@const currentUsageHeader = userInfo.headers["x-ratelimit-used"]}
									{@const currentUsage = currentUsageHeader ? Number(currentUsageHeader) : 0}
									{@const maxUsageHeader = userInfo.headers["x-ratelimit-remaining"]}
									{@const maxUsage = maxUsageHeader ? Number(maxUsageHeader) : 0}
									{@const resetHeader = userInfo.headers["x-ratelimit-reset"]}
									{@const resetTime = resetHeader
										? new Date(Number(resetHeader) * 1000)
										: undefined}
									<p class="text-sm text-green-500">
										Logged in as <strong>{userInfo.data.login}</strong>.
									</p>
									{#each requiredScopes as scope, i}
										<p class="text-sm" class:mt-1.5={i === 0}>
											{#if currentTokenScopes.includes(scope)}
												<span class="text-green-500">
													This token has the required <strong>{scope}</strong> scope.
												</span>
											{:else}
												<span class="text-red-500">
													This token doesn't have the required the <strong>{scope}</strong> scope.
												</span>
											{/if}
										</p>
									{/each}
									{#if currentUsageHeader && maxUsageHeader}
										{#if currentUsage < maxUsage}
											{@const percentage = (currentUsage / maxUsage) * 100}
											<p class="text-sm text-green-500">
												You have <strong>{maxUsage - currentUsage}</strong> ({(
													100 - percentage
												).toFixed()}%) requests left.
											</p>
										{:else}
											<p class="text-sm text-red-500">
												You have no requests left.
												{#if resetTime}
													Reset at {resetTime.toLocaleTimeString()}.
												{/if}
											</p>
										{/if}
									{/if}
								{:else}
									<p class="text-sm text-muted-foreground">
										Tired of getting rate-limited? Input your token.
									</p>
								{/if}
							</div>
							<Dialog.Footer class="mt-4">
								<Button variant="secondary" on:click={() => (settingsOpen = false)}>Cancel</Button>
								<Button
									type="submit"
									disabled={ghTokenField.length > 0 && !isTokenValid}
									on:click={() => {
										settingsOpen = false;
										settings.set(ghTokenField ? { githubToken: ghTokenField } : {});
										invalidateAll();
									}}
								>
									Save changes
								</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
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
						<DropdownMenu.Trigger asChild let:builder>
							<Button builders={[builder]} variant="ghost" size="icon" class="w-14 gap-1">
								<div class="flex items-center">
									<Sun
										class="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
									/>
									<Moon
										class="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
									/>
								</div>
								<ChevronDown
									class={"size-4 opacity-50 transition-transform" +
										(themeSwitcherOpen ? " rotate-180" : "")}
								/>
								<span class="sr-only">Change theme</span>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Label>Theme</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.RadioGroup bind:value={theme}>
								{#each themes as availableTheme}
									<DropdownMenu.RadioItem
										class="cursor-pointer data-[disabled]:opacity-100"
										value={availableTheme.value}
										disabled={theme === availableTheme.value}
										on:click={() => {
											return availableTheme.value === "system"
												? resetMode()
												: setMode(availableTheme.value);
										}}
									>
										<svelte:component this={availableTheme.icon} class="mr-2 size-4" />
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
		<div class="flex items-center bg-primary/90">
			<span class="mx-auto my-1 px-4 text-center">{newsToDisplay.content}</span>
			<Button
				variant="ghost"
				class="mr-4 h-auto rounded-none px-3 py-2 transition-transform hover:rotate-90 hover:scale-110 hover:bg-background/0"
				on:click={() => {
					if (!newsToDisplay) return;
					localStorage.setItem(
						closedNewsKey,
						JSON.stringify([...getClosedNewsIds(), newsToDisplay.id])
					);
					newsToDisplay = undefined;
				}}
			>
				<X class="size-4" />
			</Button>
		</div>
	{/if}
</header>

<svelte:window bind:scrollY />

<slot />

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
