<script>
	// From https://gist.github.com/WarningImHack3r/375c559c5ee120408f9df2390ec2747a
	// Inspired by https://gist.github.com/Sh4yy/0300299ae60af4910bcb341703946330
	let width = 0;
	let height = 0;
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<div
	class="fixed bottom-5 left-5 z-50 flex items-center space-x-2 rounded-full border border-gray-500 bg-black px-2.5 py-1 font-mono text-xs font-medium text-white shadow-lg shadow-black/50"
>
	<span>
		{width.toLocaleString()} x {height.toLocaleString()}
	</span>
	<div class="h-4 w-px bg-gray-800" />
	<span class="sm:hidden">XS</span>
	<span class="hidden sm:max-md:inline">SM</span>
	<span class="hidden md:max-lg:inline">MD</span>
	<span class="hidden lg:max-xl:inline">LG</span>
	<span class="hidden xl:max-2xl:inline">XL</span>
	<span class="max-2xl:hidden">2XL</span>
</div>
