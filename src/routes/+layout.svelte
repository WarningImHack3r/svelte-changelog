<script lang="ts">
	import "../app.pcss";
	import { onMount, type SvelteComponent } from "svelte";
	import type { SvelteHTMLElements } from "svelte/elements";
	import { ModeWatcher, resetMode, setMode } from "mode-watcher";
	import ChevronDown from "lucide-svelte/icons/chevron-down";
	import Moon from "lucide-svelte/icons/moon";
	import Monitor from "lucide-svelte/icons/monitor";
	import Sun from "lucide-svelte/icons/sun";
	import { cn } from "$lib/utils";
	import { buttonVariants, Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

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

	onMount(() => {
		if ("mode-watcher-mode" in localStorage) {
			theme = localStorage["mode-watcher-mode"].replace(/"/g, "");
		} else {
			theme = "system";
		}
	});
</script>

<ModeWatcher />
<header
	class="sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="mx-auto flex h-14 w-full items-center px-8">
		<!-- Left part -->
		<a href="/" class="flex items-center gap-2">
			<img src="https://svelte.dev/favicon.png" alt="Svelte" class="h-8" />
			<h2 class="hidden text-xl font-semibold xs:inline-block">
				Svelte
				<span class="text-primary">Changelog</span>
			</h2>
		</a>

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
					<span class="sr-only">GitHub</span>
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
</header>

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
