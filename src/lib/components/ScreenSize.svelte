<script lang="ts">
	// From https://gist.github.com/WarningImHack3r/375c559c5ee120408f9df2390ec2747a
	// Inspired by https://gist.github.com/Sh4yy/0300299ae60af4910bcb341703946330
	import { innerHeight, innerWidth } from "svelte/reactivity/window";
	import { slide } from "svelte/transition";

	let screens = $state<{ name: string; size: number }[]>([]);

	let width = $derived(innerWidth.current ?? 0);
	let height = $derived(innerHeight.current ?? 0);

	function convertToPixels(rootStyles: CSSStyleDeclaration, value: string | number) {
		if (typeof value === "number") return value;

		const num = parseFloat(value);
		const unit = value.match(/[a-z]+$/i)?.[0]?.toLowerCase();

		if (!num || !unit) return null;

		const conversions = {
			px: 1,
			em: 16,
			rem: parseFloat(rootStyles.fontSize),
			vw: width / 100,
			vh: height / 100
		};

		return num * (conversions[unit as keyof typeof conversions] ?? 0);
	}

	let matchingScreen = $derived(screens.findLast(screen => screen.size <= width));
	let showAllScreens = $state(false);

	$effect(() => {
		const styles = getComputedStyle(document.documentElement);
		// Get all computed styles for Tailwind breakpoints
		const breakpointPrefix = "--breakpoint-";
		screens = [...document.styleSheets]
			.flatMap(styleSheet => [...styleSheet.cssRules])
			.filter(
				(cssRule): cssRule is CSSLayerBlockRule =>
					cssRule instanceof CSSLayerBlockRule && cssRule.name === "theme"
			)
			.flatMap(themeLayer => [...themeLayer.cssRules])
			.filter(
				(cssRule): cssRule is CSSStyleRule =>
					cssRule instanceof CSSStyleRule && cssRule.selectorText.includes(":root")
			)
			.flatMap(cssRule => [...cssRule.style])
			.filter(style => style.startsWith(breakpointPrefix))
			.flatMap(breakpoint => {
				const size = convertToPixels(styles, styles.getPropertyValue(breakpoint).trim());
				return size
					? [
							{
								name: breakpoint.replace(breakpointPrefix, ""),
								size
							}
						]
					: [];
			})
			.sort((a, b) => a.size - b.size);
	});
</script>

<div
	class="font-mono text-xs font-medium text-white *:fixed *:border *:border-gray-500 *:bg-black *:px-2.5 *:py-1 *:shadow-lg *:shadow-black/50"
>
	<div class="bottom-5 left-5 z-50 flex items-center rounded-full pr-1!">
		<span>
			{width.toLocaleString()} x {height.toLocaleString()}
		</span>
		{#if matchingScreen}
			<div class="mr-1 ml-1.5 h-4 w-px bg-gray-800"></div>
			<button
				type="button"
				class="inline rounded-l-sm rounded-r-full px-1 hover:bg-neutral-500 active:bg-neutral-600"
				onclick={() => (showAllScreens = !showAllScreens)}
			>
				{matchingScreen.name.toUpperCase()}
			</button>
		{:else}
			<div class="mr-1"></div>
		{/if}
	</div>
	{#if showAllScreens}
		<div class="bottom-12 left-5 z-40 rounded-xl duration-300" transition:slide>
			{#each screens as screen (screen.name)}
				<div
					class={[
						"flex justify-between gap-6",
						{
							"font-bold": screen.name === matchingScreen?.name,
							"opacity-75": screen.name !== matchingScreen?.name
						}
					]}
				>
					<span>{screen.name.toUpperCase()}</span>
					<span class="text-neutral-400">{screen.size.toLocaleString()}px</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
