<script lang="ts">
	import { getAstNode } from "svelte-exmarkdown";

	export let start: number | undefined = undefined;

	const node = getAstNode();
</script>

{#if $node.tagName === "ol"}
	<ol start={start ?? 1} class="my-6 ml-6 list-decimal [&>li]:mt-2 [li>&]:my-2">
		<slot />
	</ol>
{:else}
	<ul class="my-6 ml-6 list-disc [&>li]:mt-2 [li>&]:my-2 [li>&]:list-[circle]">
		<slot />
	</ul>
{/if}
