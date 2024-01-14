<script lang="ts">
	/**
	 * The raw markdown string.
	 */
	export let raw: string;
	/**
	 * The depth of the heading (1-6).
	 */
	export let depth: number;
	/**
	 * The text of the heading.
	 */
	export let text: string;
</script>

{#if depth === 1}
	<h1 class="text-2xl font-extrabold tracking-tight lg:text-3xl"><slot /></h1>
{:else if depth === 2}
	<h2 class="border-b pb-2 text-xl font-semibold tracking-tight"><slot /></h2>
{:else if depth === 3}
	<h3 class="text-lg font-semibold tracking-tight"><slot /></h3>
{:else if depth === 4}
	<h4 class="font-semibold tracking-tight"><slot /></h4>
{:else if depth === 5}
	<h5><slot /></h5>
{:else if depth === 6}
	<h6><slot /></h6>
{:else}
	{raw}
{/if}
