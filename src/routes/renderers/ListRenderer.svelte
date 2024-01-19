<script lang="ts">
	/**
	 * A list item.
	 */
	type ListItem = {
		type: string;
		raw: string;
		task: boolean;
		loose: boolean;
		text: string;
		tokens: Token[];
	};

	/**
	 * A token.
	 */
	type Token = {
		type: string;
		raw: string;
		href: string | undefined;
		title: string | null | undefined;
		text: string;
		tokens: Token[] | undefined;
	};

	/**
	 * Whether the list is ordered (ol) or unordered (ul).
	 */
	export let ordered: boolean;
	/**
	 * The raw markdown string.
	 */
	export let raw: string;
	/**
	 * The starting number for ordered lists.
	 */
	export let start: number;
	export let loose: boolean;
	export let items: ListItem[];
</script>

{#if ordered}
	<ol {start} class="my-6 ml-6 list-decimal [&>li]:mt-2 [li>&]:my-2">
		<slot />
	</ol>
{:else}
	<ul class="my-6 ml-6 list-disc [&>li]:mt-2 [li>&]:my-2 [li>&]:list-[circle]">
		<slot />
	</ul>
{/if}
