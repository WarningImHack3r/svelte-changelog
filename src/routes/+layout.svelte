<script lang="ts">
	import "../app.pcss";
	import { onMount } from "svelte";
	import { ModeWatcher, resetMode, setMode } from "mode-watcher";
	import { ChevronDown, Github, Monitor, Moon, Sun } from "lucide-svelte";
	import { cn } from "$lib/utils";
	import { buttonVariants, Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

	// Theme selector
	let theme: "light" | "dark" | "system";
	let themeSwitcherOpen = false;

	onMount(() => {
		if ("userPrefersMode" in localStorage) {
			theme = localStorage.userPrefersMode.replace(/"/g, "");
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
			<div class="hidden xs:block">
				<h2 class="font-semibold xs:text-xl">
					Svelte
					<span class="text-primary">Changelog</span>
				</h2>
			</div>
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
					<Github class="size-5" />
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
							<DropdownMenu.RadioItem
								class="cursor-pointer"
								value="light"
								on:click={() => setMode("light")}
							>
								<Sun class="mr-2 size-4" />
								<span>Light</span>
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem
								class="cursor-pointer"
								value="dark"
								on:click={() => setMode("dark")}
							>
								<Moon class="mr-2 size-4" />
								<span>Dark</span>
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem
								class="cursor-pointer"
								value="system"
								on:click={() => resetMode()}
							>
								<Monitor class="mr-2 size-4" />
								<span>System</span>
							</DropdownMenu.RadioItem>
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
