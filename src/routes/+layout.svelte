<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { dev } from "$app/environment";
	import { env } from "$env/dynamic/public";
	import { page } from "$app/state";
	import {
		ChevronDown,
		type Icon,
		LoaderCircle,
		LogOut,
		Monitor,
		Moon,
		Sun,
		X
	} from "@lucide/svelte";
	import { ModeWatcher, resetMode, setMode } from "mode-watcher";
	import { Octokit } from "octokit";
	import { persisted } from "svelte-persisted-store";
	import { toast } from "svelte-sonner";
	import { news } from "$lib/news/news.json";
	import { FAVICON_URL } from "$lib/config";
	import { getTabState, initTabState, plainTextSerializer } from "$lib/stores";
	import { tokenKey } from "$lib/types";
	import { cn } from "$lib/utils";
	import ScreenSize from "$lib/components/ScreenSize.svelte";
	import { buttonVariants, Button } from "$lib/components/ui/button";
	import { Progress } from "$lib/components/ui/progress";
	import { Toaster } from "$lib/components/ui/sonner";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { typedEntries } from "$lib/util";

	// State
	initTabState();
	const tabState = getTabState();

	let { data, children } = $props();

	let scrollY = $state(0);

	// User dropdown
	const token = persisted(tokenKey, "", {
		serializer: plainTextSerializer
	});
	const toastedTokens = persisted<string[]>("toastedTokens", []);
	let isAuthenticating = $state(false);
	let authenticatingToastId = $state<string | number>();
	let user =
		$state<
			Awaited<ReturnType<InstanceType<typeof Octokit>["rest"]["users"]["getAuthenticated"]>>["data"]
		>();
	toastedTokens.subscribe(tokens => {
		if (tokens.includes($token)) return;
		if (isAuthenticating) {
			authenticatingToastId = toast.loading("Authenticating...", {
				description: "Logging you in with GitHub"
			});
		}
		if (user) {
			if (authenticatingToastId) {
				toast.info("Authenticated", {
					id: authenticatingToastId
				});
				authenticatingToastId = undefined;
			}
			toast.success("Authenticated", {
				description: `Welcome, ${user.login}!`
			});
			toastedTokens.update(toasted => [...new Set([...toasted, $token])]);
		}
	});
	token.subscribe(newToken => {
		if (!newToken) return;
		isAuthenticating = true;
		user = undefined;
		new Octokit({ auth: newToken }).rest.users
			.getAuthenticated()
			.then(({ data }) => {
				isAuthenticating = false;
				user = data;
			})
			.catch(() => {
				isAuthenticating = false;
			});
	});
	let userDropdownOpen = $state(false);

	// Theme selector
	type Theme = {
		value: typeof theme;
		label: string;
		icon: typeof Icon;
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
	let theme = $state<"light" | "dark" | "system">("system");
	let themeSwitcherOpen = $state(false);

	// News
	let newsToDisplay = $state<(typeof news)[number]>();
	const closedNewsKey = "closedNews";
	function getClosedNewsIds() {
		return JSON.parse(localStorage.getItem(closedNewsKey) ?? "[]") as (typeof news)[number]["id"][];
	}

	onMount(() => {
		// Theme
		theme =
			"mode-watcher-mode" in localStorage
				? localStorage["mode-watcher-mode"].replace(/"/g, "")
				: "system";

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
<Toaster />
<header
	class="sticky top-0 z-40 w-full bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div
		class={[
			"border-b transition-colors duration-500",
			{
				"border-transparent": !newsToDisplay && scrollY < 25
			}
		]}
	>
		<div class="mx-auto flex h-14 w-full items-center px-8">
			<!-- Left part -->
			<a href="/" class="flex items-center gap-2" onclick={() => tabState.set("svelte")}>
				<img src={FAVICON_URL} alt="Svelte" class="size-8" />
				<h2 class="hidden text-xl font-semibold xs:inline-block">
					Svelte
					<span class="text-primary">Changelog</span>
				</h2>
			</a>

			<!-- Navigation -->
			<!-- TODO: don't hardcode scrollY? -->
			{#if scrollY > 150 && page.route.id === "/"}
				<ul transition:fade={{ duration: 200 }} class="ml-6 hidden sm:block">
					<li>
						{#each typedEntries(data.repos) as [id, { name }] (id)}
							<Button
								variant="ghost"
								class="hover:bg-accent/75"
								onclick={() => tabState.set(id)}
								disabled={$tabState === id}
							>
								{name}
							</Button>
						{/each}
					</li>
				</ul>
			{/if}

			<!-- Right part -->
			<div class="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
				<nav class="flex items-center space-x-1">
					{#if isAuthenticating}
						<Button variant="outline" size="icon" disabled>
							<LoaderCircle class="size-4 animate-spin" />
						</Button>
					{:else if !user}
						<Button href="/login" variant="outline" class="gap-1.5">
							Log in with
							<img src="/github.svg" alt="GitHub" class="size-4 dark:invert" />
							<span class="sr-only">GitHub</span>
						</Button>
					{:else}
						<DropdownMenu.Root bind:open={userDropdownOpen}>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="ghost" size="icon" class="w-14 gap-1">
										<Avatar.Root class="size-6">
											<Avatar.Image src={user?.avatar_url} alt={user?.login} />
											<Avatar.Fallback>
												{user?.login.charAt(0).toUpperCase()}
											</Avatar.Fallback>
										</Avatar.Root>
										<ChevronDown
											class="size-4 opacity-50 transition-transform {userDropdownOpen
												? 'rotate-180'
												: ''}"
										/>
										<span class="sr-only">Manage user</span>
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="max-w-60">
								<DropdownMenu.Label class="font-normal">
									<span class="font-semibold">Logged in as {user.login}</span>
									{#if dev && env.PUBLIC_GITHUB_TOKEN}
										<em class="mt-1 block text-xs font-light text-red-500">
											Dev mode with custom token enabled, user token not used
										</em>
									{/if}
									{#await new Octokit({ auth: $token }).rest.users.getAuthenticated()}
										<div class="mt-1 flex items-center gap-2">
											<LoaderCircle class="size-4 animate-spin" />
											Loading stats...
										</div>
									{:then { headers }}
										{@const currentUsageHeader = headers["x-ratelimit-used"]}
										{@const currentUsage = currentUsageHeader ? Number(currentUsageHeader) : 0}
										{@const maxUsageHeader = headers["x-ratelimit-remaining"]}
										{@const maxUsage = maxUsageHeader ? Number(maxUsageHeader) : 0}
										{@const resetHeader = headers["x-ratelimit-reset"]}
										{@const resetTime = resetHeader
											? new Date(Number(resetHeader) * 1000)
											: undefined}
										{#if currentUsageHeader && maxUsageHeader}
											<div class="my-1 inline-flex items-baseline gap-1.5">
												<h4 class="font-semibold">Token consumption</h4>
												{#if currentUsage < maxUsage}
													{@const percentage = (currentUsage / maxUsage) * 100}
													<span class="text-sm font-light text-muted-foreground">
														• {Math.round(percentage)}%
													</span>
												{/if}
											</div>
											{#if currentUsage < maxUsage}
												<Progress value={currentUsage} max={maxUsage} />
											{:else}
												<p class="text-sm text-red-500">
													You have no requests left.
													{#if resetTime}
														Reset at {resetTime.toLocaleTimeString()}.
													{/if}
												</p>
											{/if}
										{/if}
									{/await}
								</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									onclick={() => {
										toastedTokens.update(toasted => toasted.filter(t => t !== $token));
										localStorage.removeItem(tokenKey);
										user = undefined;
										toast.success("Logged out", {
											description: "You have been logged out. Refreshing in 3 seconds...",
											duration: 3000,
											onAutoClose: () => location.reload()
										});
									}}
									class="cursor-pointer text-red-500"
								>
									<LogOut class="mr-2 size-4" />
									Logout
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
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
								{#each themes as availableTheme (availableTheme.value)}
									<DropdownMenu.RadioItem
										class="cursor-pointer data-[disabled]:opacity-75"
										value={availableTheme.value}
										disabled={theme === availableTheme.value}
										onclick={() => {
											return availableTheme.value === "system"
												? resetMode()
												: setMode(availableTheme.value);
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
		<div class="flex items-center bg-primary/90">
			<span class="mx-auto my-1 px-4 text-center">{newsToDisplay.content}</span>
			<Button
				variant="ghost"
				class="mr-4 h-auto rounded-none px-3 py-2 transition-transform hover:scale-110 hover:rotate-90 hover:bg-background/0"
				onclick={() => {
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

{@render children?.()}

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
