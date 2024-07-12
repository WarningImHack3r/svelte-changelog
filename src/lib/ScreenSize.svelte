<script lang="ts">
	// From https://gist.github.com/WarningImHack3r/375c559c5ee120408f9df2390ec2747a
	// Inspired by https://gist.github.com/Sh4yy/0300299ae60af4910bcb341703946330
	import { slide } from "svelte/transition";
	import tailwindConfig from "/tailwind.config";
	import resolveConfig from "tailwindcss/resolveConfig";

	const fullConfig = resolveConfig(tailwindConfig);
	const screens = Object.keys(fullConfig.theme.screens)
		.map(screen => ({
			name: screen,
			size: parseInt(fullConfig.theme.screens[screen].replace("px", ""))
		}))
		.sort((a, b) => a.size - b.size);
	let matchingScreen: (typeof screens)[number] | undefined;
	$: matchingScreen = screens.findLast(screen => screen.size <= width);

	let width = 0;
	let height = 0;

	let showAllScreens = false;
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<div
	class="font-mono text-xs font-medium text-white *:fixed *:border *:border-gray-500 *:bg-black *:px-2.5 *:py-1 *:shadow-lg *:shadow-black/50"
>
	<div class="bottom-5 left-5 z-50 flex items-center rounded-full !pr-1">
		<span>
			{width.toLocaleString()} x {height.toLocaleString()}
		</span>
		{#if matchingScreen}
			<div class="ml-1.5 mr-1 h-4 w-px bg-gray-800"></div>
			<button
				type="button"
				class="inline rounded-l-sm rounded-r-full px-1 hover:bg-neutral-500 active:bg-neutral-600"
				on:click={() => (showAllScreens = !showAllScreens)}
			>
				{matchingScreen.name.toUpperCase()}
			</button>
		{/if}
	</div>
	{#if showAllScreens}
		<div class="bottom-12 left-5 z-40 rounded-xl duration-300" transition:slide>
			{#each screens as screen}
				<div class="flex justify-between gap-8">
					<span>{screen.name.toUpperCase()}</span>
					<span class="text-neutral-400">{screen.size.toLocaleString()}px</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
