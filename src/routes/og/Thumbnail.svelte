<script lang="ts">
	type Props = {
		title: string;
		description?: string;
		secondaryIconUrl?: string;
	};

	let { title, description, secondaryIconUrl }: Props = $props();
</script>

<div class="flex h-full w-full border-b border-orange-600" style:border-bottom-width="32px">
	<div class="flex flex-col p-8">
		<div class="flex items-center" style:gap="8">
			<img
				src="https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg"
				alt="Svelte"
				class="w-16"
			/>
			<span class="flex text-4xl" style:gap="6">
				<span style:font-family="DisplayFont">Svelte</span>
				<span class="text-orange-600" style:font-family="SansFontSemibold">Changelog</span>
			</span>
		</div>
		{#if secondaryIconUrl}
			{@const src = secondaryIconUrl}
			<img {src} alt="Secondary icon" class="ml-auto w-16" />
		{/if}
		<div class="my-auto flex flex-col justify-center">
			<p class="text-7xl" style:font-family="DisplayFont">{title}</p>
			{#if description}
				<p class="text-4xl text-gray-600" style:font-family="SansFont">{description}</p>
			{/if}
		</div>
	</div>
</div>
